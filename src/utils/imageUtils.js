'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * Saves base64 data URIs or base64 image strings to public/uploads directory as static files
 * and returns the relative or absolute hosted image URL.
 */
function saveBase64ImageToDisk(raw) {
    try {
        let cleanBase64 = String(raw).trim();
        let ext = 'jpg';
        const match = cleanBase64.match(/^data:image\/([a-zA-Z0-9\+\-\.]+);base64,(.+)$/i);
        if (match) {
            ext = match[1].split('/')[1]?.split('+')[0] || match[1].split('+')[0] || 'jpg';
            if (ext === 'jpeg' || ext === 'avif' || ext === 'heic' || ext === 'heif') ext = 'jpg';
            cleanBase64 = match[2];
        } else if (cleanBase64.includes('base64,')) {
            cleanBase64 = cleanBase64.split('base64,')[1];
        }
        const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        if (!validExts.includes(ext.toLowerCase())) ext = 'jpg';

        const timestamp = Date.now();
        const rand = Math.floor(Math.random() * 100000);
        const filename = `img-${timestamp}-${rand}.${ext}`;

        const uploadDir = path.join(__dirname, '../../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, filename);
        const buf = Buffer.from(cleanBase64, 'base64');
        if (buf.length > 0) {
            fs.writeFileSync(filePath, buf);
            const base = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
            return base ? `${base}/uploads/${filename}` : `/uploads/${filename}`;
        }
    } catch (_) {}
    return null;
}

/**
 * Follows HTTP redirects and returns the final URL (up to maxRedirects hops).
 * Used to resolve short URLs like share.google/... into their final destination.
 */
function followRedirects(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        let redirectCount = 0;

        function doRequest(currentUrl) {
            if (redirectCount > maxRedirects) {
                return resolve(currentUrl);
            }
            const lib = currentUrl.startsWith('https') ? https : http;
            const req = lib.get(currentUrl, { timeout: 5000 }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    redirectCount++;
                    let nextUrl = res.headers.location;
                    if (nextUrl.startsWith('/')) {
                        const parsed = new URL(currentUrl);
                        nextUrl = `${parsed.protocol}//${parsed.host}${nextUrl}`;
                    }
                    res.resume();
                    doRequest(nextUrl);
                } else {
                    res.resume();
                    resolve(currentUrl);
                }
            });
            req.on('error', () => resolve(currentUrl));
            req.on('timeout', () => { req.destroy(); resolve(currentUrl); });
        }

        doRequest(url);
    });
}

/**
 * Extracts the real image URL from a Google imgres viewer page URL.
 * e.g. https://www.google.com/imgres?imgurl=https%3A%2F%2Fsite.com%2Fimage.jpg...
 */
function extractImgresUrl(url) {
    try {
        const parsed = new URL(url);
        const imgurl = parsed.searchParams.get('imgurl');
        if (imgurl) return decodeURIComponent(imgurl);
    } catch (_) {}
    const match = url.match(/[?&]imgurl=([^&]+)/i);
    if (match && match[1]) return decodeURIComponent(match[1]);
    return null;
}

/**
 * Normalizes and sanitizes user/vendor submitted image URLs (synchronous).
 * Handles Google Search redirect links, Google Drive share links, Google Photos links,
 * missing http/https protocols, and URL encoding quirks.
 *
 * NOTE: share.google / photos.app.goo.gl short URLs require async resolution.
 * Use resolveImageUrl() in controllers that save image URLs to the database.
 *
 * @param {string} rawUrl - The image URL submitted by user or vendor
 * @param {string} defaultFallback - Fallback URL if rawUrl is empty or invalid
 * @returns {string} Clean, direct embeddable image URL
 */
function normalizeImageUrl(rawUrl, defaultFallback = null) {
    if (!rawUrl || typeof rawUrl !== 'string') return defaultFallback;

    let url = rawUrl.trim();
    url = url.replace(/^["']|["']$/g, '').trim();
    if (!url || url.length < 5 || url === 'null' || url === 'undefined') return defaultFallback;

    try {
        // 0. Auto-convert Base64 data URIs or raw base64 strings into saved static upload files
        if (url.startsWith('data:image/') || (url.length > 500 && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/uploads/'))) {
            const savedUrl = saveBase64ImageToDisk(url);
            if (savedUrl) return savedUrl;
        }

        // Fix malformed URLs like https:///uploads/ or http:///uploads/
        if (url.startsWith('https:///')) {
            url = url.replace('https:///', 'https://');
        } else if (url.startsWith('http:///')) {
            url = url.replace('http:///', 'http://');
        }

        // Handle relative upload paths (e.g. /uploads/... or uploads/...)
        if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
            const cleanPath = url.startsWith('/') ? url : `/${url}`;
            const base = (process.env.PUBLIC_API_URL || 'https://digi-local-backend.onrender.com').replace(/\/$/, '');
            url = `${base}${cleanPath}`;
        }

        // 1. Handle Google Search Redirect & Google Image Search Result URLs
        // e.g. https://www.google.com/url?sa=i&url=https%3A%2F%2Fsite.com%2Fimage.jpg...
        // e.g. https://www.google.com/imgres?imgurl=https%3A%2F%2Fsite.com%2Fimage.jpg...
        if (url.includes('google.') && (url.includes('/url?') || url.includes('/imgres?'))) {
            try {
                const parsed = new URL(url);
                const targetImg = parsed.searchParams.get('imgurl') || parsed.searchParams.get('url');
                if (targetImg) {
                    url = decodeURIComponent(targetImg);
                }
            } catch (e) {
                const matchImg = url.match(/(?:imgurl|url)=([^&]+)/i);
                if (matchImg && matchImg[1]) {
                    url = decodeURIComponent(matchImg[1]);
                }
            }
        }

        // 2. Handle Google Drive Share & View Links
        // e.g. https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing
        if (url.includes('drive.google.com')) {
            let fileId = null;
            const matchPath = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (matchPath && matchPath[1]) {
                fileId = matchPath[1];
            } else {
                try {
                    const parsed = new URL(url);
                    fileId = parsed.searchParams.get('id');
                } catch (e) {
                    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                    if (matchId) fileId = matchId[1];
                }
            }
            if (fileId) {
                return `https://lh3.googleusercontent.com/d/${fileId}`;
            }
        }

        // 3. Google Photos CDN URLs — already direct, pass through
        if (/lh[3-9]\.googleusercontent\.com/.test(url)) {
            return url;
        }

        // 4. share.google / photos.app.goo.gl / photos.google.com — requires async redirect
        // resolveImageUrl() handles these. Return as-is here for sync contexts.
        if (url.includes('share.google') || url.includes('photos.app.goo.gl') ||
            url.includes('photos.google.com')) {
            return url;
        }

        // 5. Upgrade insecure Render HTTP URLs to HTTPS
        if (typeof url === 'string' && url.startsWith('http://') && url.includes('onrender.com')) {
            url = url.replace(/^http:\/\//i, 'https://');
        }

        // 6. Fix missing protocol
        if (!/^https?:\/\//i.test(url) && !url.startsWith('data:') && !url.startsWith('blob:')) {
            url = `https://${url}`;
        }

        // 7. Validate URL syntax
        new URL(url);
        return url;
    } catch (err) {
        return url || defaultFallback;
    }
}

/**
 * Async version — resolves share.google, photos.app.goo.gl, and other redirect-based
 * short links into direct embeddable image URLs by following HTTP redirects.
 *
 * @param {string} rawUrl - The image URL submitted by user or vendor
 * @param {string} defaultFallback - Fallback URL if resolution fails
 * @returns {Promise<string>} Direct embeddable image URL
 */
async function resolveImageUrl(rawUrl, defaultFallback = null) {
    if (!rawUrl || typeof rawUrl !== 'string') return defaultFallback;

    let url = rawUrl.trim().replace(/^["']|["']$/g, '').trim();
    if (!url || url.length < 5) return defaultFallback;

    try {
        // Handle share.google short URLs (Google Image Search / Photos viewer redirect)
        // These redirect to a Google imgres page where the real image URL is in ?imgurl=
        if (url.includes('share.google') || url.includes('goo.gl') || url.includes('photos.app.goo.gl')) {
            try {
                const finalUrl = await followRedirects(url);

                // Try to extract ?imgurl= from the final Google imgres viewer URL
                const extracted = extractImgresUrl(finalUrl);
                if (extracted && extracted.startsWith('http')) {
                    return extracted;
                }

                // If the URL already resolved to a direct image
                if (/\.(jpg|jpeg|png|webp|gif|heic|bmp|tiff)(\?|$)/i.test(finalUrl)) {
                    return finalUrl;
                }

                // Google Photos CDN
                if (finalUrl.includes('googleusercontent.com')) {
                    return finalUrl;
                }

                return defaultFallback;
            } catch (_) {
                return defaultFallback;
            }
        }

        // For all other URLs, use the sync normalizer
        return normalizeImageUrl(url, defaultFallback);
    } catch (_) {
        return defaultFallback;
    }
}

const DEFAULT_PRODUCT_SERVICE_IMAGE = 'https://i.imghos.co/NwtAJsPG.jpg';

module.exports = {
    normalizeImageUrl,
    resolveImageUrl,
    saveBase64ImageToDisk,
    DEFAULT_PRODUCT_SERVICE_IMAGE
};
