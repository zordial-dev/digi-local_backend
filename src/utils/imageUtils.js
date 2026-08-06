'use strict';

const https = require('https');
const http = require('http');

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
function normalizeImageUrl(rawUrl, defaultFallback = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80') {
    if (!rawUrl || typeof rawUrl !== 'string') return defaultFallback;

    let url = rawUrl.trim();
    url = url.replace(/^["']|["']$/g, '').trim();
    if (!url || url.length < 5) return defaultFallback;

    try {
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

        // 5. Fix missing protocol
        if (!/^https?:\/\//i.test(url) && !url.startsWith('data:') && !url.startsWith('blob:')) {
            url = `https://${url}`;
        }

        // 6. Validate URL syntax
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
async function resolveImageUrl(rawUrl, defaultFallback = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80') {
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

module.exports = { normalizeImageUrl, resolveImageUrl };
