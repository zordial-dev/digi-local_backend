'use strict';

/**
 * Normalizes and sanitizes user-submitted image URLs, particularly handling
 * Google Images Search redirect links, Google Drive view links, and missing protocols.
 * 
 * @param {string} rawUrl - The image URL submitted by user or vendor
 * @param {string} defaultFallback - Fallback URL if rawUrl is empty or invalid
 * @returns {string} Clean, direct embeddable image URL
 */
function normalizeImageUrl(rawUrl, defaultFallback = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80') {
    if (!rawUrl || typeof rawUrl !== 'string') return defaultFallback;

    let url = rawUrl.trim();

    if (!url) return defaultFallback;

    try {
        // 1. Handle Google Search Redirect & Image Search URLs
        // e.g. https://www.google.com/imgres?imgurl=https%3A%2F%2Fsite.com%2Fimage.jpg...
        if (url.includes('google.com/url') || url.includes('google.com/imgres') || url.includes('google.co.in/url')) {
            const parsed = new URL(url);
            const targetImg = parsed.searchParams.get('imgurl') || parsed.searchParams.get('url');
            if (targetImg) {
                url = decodeURIComponent(targetImg);
            }
        }

        // 2. Handle Google Drive Share / Preview links
        // e.g. https://drive.google.com/open?id=1ABC123xyz
        if (url.includes('drive.google.com')) {
            let fileId = null;

            const matchPath = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (matchPath && matchPath[1]) {
                fileId = matchPath[1];
            } else {
                const parsed = new URL(url);
                fileId = parsed.searchParams.get('id');
            }

            if (fileId) {
                // Return high-reliability direct view URL for Google Drive hosted images
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
        // If URL parsing fails, return fallback
        return url || defaultFallback;
    }
}

module.exports = { normalizeImageUrl };
