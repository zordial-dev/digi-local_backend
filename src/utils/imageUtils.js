'use strict';

/**
 * Normalizes and sanitizes user/vendor submitted image URLs.
 * Handles Google Search redirect links, Google Drive share links, Google Photos links,
 * missing http/https protocols, and URL encoding quirks.
 * 
 * @param {string} rawUrl - The image URL submitted by user or vendor
 * @param {string} defaultFallback - Fallback URL if rawUrl is empty or invalid
 * @returns {string} Clean, direct embeddable image URL
 */
function normalizeImageUrl(rawUrl, defaultFallback = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80') {
    if (!rawUrl || typeof rawUrl !== 'string') return defaultFallback;

    let url = rawUrl.trim();

    // Clean wrapped quotes or space encoding
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
                // regex fallback for malformed search URLs
                const matchImg = url.match(/(?:imgurl|url)=([^&]+)/i);
                if (matchImg && matchImg[1]) {
                    url = decodeURIComponent(matchImg[1]);
                }
            }
        }

        // 2. Handle Google Drive Share & View Links
        // e.g. https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing
        // e.g. https://drive.google.com/open?id=1ABC123xyz
        // e.g. https://drive.google.com/uc?id=1ABC123xyz
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
                // High-reliability direct Google content link for image tags
                return `https://lh3.googleusercontent.com/d/${fileId}`;
            }
        }

        // 3. Fix missing protocol (e.g. "images.unsplash.com/photo-123")
        if (!/^https?:\/\//i.test(url) && !url.startsWith('data:') && !url.startsWith('blob:')) {
            url = `https://${url}`;
        }

        // 4. Validate URL syntax
        new URL(url);

        return url;
    } catch (err) {
        return url || defaultFallback;
    }
}

module.exports = { normalizeImageUrl };
