const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const vendorPanelController = require('../controllers/vendorPanelController');
const { authenticateToken, requireVendorOwner } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { addItemSchema, updateSettingsSchema } = require('../schemas/vendorSchema');

// ── Multer Storage Config ────────────────────────────────────
// Allowed MIME types (covers camera photos which may have no extension)
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',    // iOS camera HEIC format
    'image/heif',    // iOS camera HEIF format
    'image/bmp',
    'image/tiff',
];

// Extension → MIME fallback map for files with known extensions
const EXT_TO_MIME = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.webp': 'image/webp',
    '.gif': 'image/gif', '.heic': 'image/heic',
    '.heif': 'image/heif', '.bmp': 'image/bmp', '.tiff': 'image/tiff',
};

// Extension to use when saving file (normalize HEIC/HEIF → .jpg for broad compatibility)
function resolveExtension(file) {
    const mimeToExt = {
        'image/jpeg': '.jpg', 'image/jpg': '.jpg',
        'image/png': '.png', 'image/webp': '.webp',
        'image/gif': '.gif', 'image/heic': '.heic',
        'image/heif': '.heif', 'image/bmp': '.bmp', 'image/tiff': '.tiff',
    };
    // Prefer MIME type for extension resolution (camera photos may have no/wrong extension)
    if (file.mimetype && mimeToExt[file.mimetype.toLowerCase()]) {
        return mimeToExt[file.mimetype.toLowerCase()];
    }
    const extFromName = path.extname(file.originalname || '').toLowerCase();
    return extFromName || '.jpg'; // fallback to .jpg if truly unknown
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads');
        // Ensure uploads directory exists
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = resolveExtension(file);
        const unique = `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, unique);
    }
});

const fileFilter = (req, file, cb) => {
    const mimeOk = ALLOWED_MIME_TYPES.includes((file.mimetype || '').toLowerCase());
    const ext = path.extname(file.originalname || '').toLowerCase();
    const extOk = !ext || Object.keys(EXT_TO_MIME).includes(ext); // no-extension is OK (camera photos)

    if (mimeOk || extOk) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `Only image files are allowed. Received: ${file.mimetype || 'unknown'}. Allowed: jpg, png, webp, gif, heic`));
    }
};

// 10MB limit — camera photos can be 5-8MB, 5MB was too restrictive
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * Multer error handler middleware — returns clean JSON instead of crashing the app.
 * Must be used after upload middleware on every upload route.
 */
function handleMulterError(err, req, res, next) {
    if (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({
                    error: 'Image file is too large. Maximum allowed size is 10MB. Please compress or resize your photo before uploading.',
                    code: 'FILE_TOO_LARGE'
                });
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                // Wrong field name: multer throws LIMIT_UNEXPECTED_FILE when field name != expected
                // Invalid file type: our fileFilter also throws LIMIT_UNEXPECTED_FILE with err.field = 'image'
                const isWrongField = err.field && err.field !== 'image';
                return res.status(400).json({
                    error: isWrongField
                        ? `Wrong field name "${err.field}". Use field name "image" to upload a photo.`
                        : (err.message || 'Invalid file type. Only image files (jpg, png, webp, gif, heic) are allowed.'),
                    code: isWrongField ? 'WRONG_FIELD_NAME' : 'INVALID_FILE_TYPE',
                    hint: isWrongField
                        ? 'Use field name exactly "image" when uploading photos from camera or gallery.'
                        : 'Supported formats: jpg, jpeg, png, webp, gif, heic'
                });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}`, code: err.code });
        }
        // Non-multer error (e.g. filesystem error)
        return res.status(500).json({ error: 'File upload failed. Please try again.', details: err.message });
    }
    next();
}

// POST /api/vendorPanel/upload-image - Upload item image
// Supports camera photos (JPEG/HEIC/no-extension), gallery images, URLs
// handleMulterError MUST come after upload middleware to catch size/type errors gracefully
router.post('/upload-image', upload.single('image'), handleMulterError, vendorPanelController.uploadImage);

// GET /api/vendorPanel/:vendorId - Full vendor dashboard data
router.get('/:vendorId', authenticateToken, requireVendorOwner, vendorPanelController.getDashboard);

// POST /api/vendorPanel/:vendorId/items - Add item
router.post('/:vendorId/items', authenticateToken, requireVendorOwner, validateRequest(addItemSchema), vendorPanelController.addItem);

// PUT /api/vendorPanel/:vendorId/items/:itemId - Edit item or toggle availability
router.put('/:vendorId/items/:itemId', authenticateToken, requireVendorOwner, vendorPanelController.updateItem);

// Toggle Item Availability Endpoints
router.patch('/items/:itemId/availability', authenticateToken, vendorPanelController.toggleAvailability);
router.put('/items/:itemId/availability', authenticateToken, vendorPanelController.toggleAvailability);
router.patch('/:vendorId/items/:itemId/availability', authenticateToken, vendorPanelController.toggleAvailability);
router.put('/:vendorId/items/:itemId/availability', authenticateToken, vendorPanelController.toggleAvailability);

// DELETE /api/vendorPanel/:vendorId/items/:itemId - Delete item
router.delete('/:vendorId/items/:itemId', authenticateToken, requireVendorOwner, vendorPanelController.deleteItem);

// PUT /api/vendorPanel/:vendorId/settings - Update store settings
router.put('/:vendorId/settings', authenticateToken, requireVendorOwner, validateRequest(updateSettingsSchema), vendorPanelController.updateSettings);

// POST /api/vendorPanel/:vendorId/renew - Renew vendor subscription
router.post('/:vendorId/renew', authenticateToken, requireVendorOwner, vendorPanelController.renewSubscription);

// FCM / Expo Push Device Token Endpoints
router.post('/fcm-token', vendorPanelController.registerFcmToken);
router.post('/:vendorId/fcm-token', vendorPanelController.registerFcmToken);
router.delete('/fcm-token', vendorPanelController.deleteFcmToken);
router.delete('/:vendorId/fcm-token', vendorPanelController.deleteFcmToken);

// DELETE /api/vendorPanel/:vendorId or /api/vendorPanel/:vendorId/store - Delete Vendor Store
router.delete('/:vendorId', authenticateToken, requireVendorOwner, vendorPanelController.deleteStore);
router.delete('/:vendorId/store', authenticateToken, requireVendorOwner, vendorPanelController.deleteStore);

module.exports = router;
