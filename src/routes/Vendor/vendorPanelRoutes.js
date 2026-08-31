const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const vendorPanelController = require('../../controllers/Vendor/vendorPanelController');
const vendorAuthController = require('../../controllers/Vendor/vendorAuthController');
const { authenticateToken, requireVendorOwner } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validate');
const { addItemSchema, updateSettingsSchema } = require('../../schemas/vendorSchema');

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/gif', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff',
];

const EXT_TO_MIME = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.webp': 'image/webp',
    '.gif': 'image/gif', '.heic': 'image/heic',
    '.heif': 'image/heif', '.bmp': 'image/bmp', '.tiff': 'image/tiff',
};

function resolveExtension(file) {
    const mimeToExt = {
        'image/jpeg': '.jpg', 'image/jpg': '.jpg',
        'image/png': '.png', 'image/webp': '.webp',
        'image/gif': '.gif', 'image/heic': '.heic',
        'image/heif': '.heif', 'image/bmp': '.bmp', 'image/tiff': '.tiff',
    };
    if (file.mimetype && mimeToExt[file.mimetype.toLowerCase()]) {
        return mimeToExt[file.mimetype.toLowerCase()];
    }
    const extFromName = path.extname(file.originalname || '').toLowerCase();
    return extFromName || '.jpg';
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../../public/uploads');
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
    const extOk = !ext || Object.keys(EXT_TO_MIME).includes(ext);

    if (mimeOk || extOk) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `Only image files are allowed.`));
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

function handleMulterError(err, req, res, next) {
    if (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message, code: err.code });
        }
        return res.status(500).json({ error: 'File upload failed.', details: err.message });
    }
    next();
}

// POST /api/vendorPanel/upload-image & /upload-logo
router.post('/upload-image', upload.any(), handleMulterError, vendorPanelController.uploadImage);
router.post('/upload-logo', upload.any(), handleMulterError, vendorPanelController.uploadImage);

// POST/PUT /api/vendorPanel/:vendorId/logo
router.post('/:vendorId/logo', upload.any(), handleMulterError, vendorPanelController.updateVendorLogo);
router.put('/:vendorId/logo', upload.any(), handleMulterError, vendorPanelController.updateVendorLogo);

// Direct vendor status check
router.get('/status', vendorAuthController.getVendorStatus);
router.get('/:vendorId/status', vendorAuthController.getVendorStatus);

// GET /api/vendorPanel/:vendorId - Full vendor dashboard data
router.get('/:vendorId', authenticateToken, requireVendorOwner, vendorPanelController.getDashboard);

// POST /api/vendorPanel/:vendorId/items
router.post('/:vendorId/items', authenticateToken, requireVendorOwner, validateRequest(addItemSchema), vendorPanelController.addItem);

// PUT /api/vendorPanel/:vendorId/items/:itemId
router.put('/:vendorId/items/:itemId', authenticateToken, requireVendorOwner, vendorPanelController.updateItem);

// Toggle Item Availability Endpoints
router.patch('/items/:itemId/availability', authenticateToken, vendorPanelController.toggleAvailability);
router.put('/items/:itemId/availability', authenticateToken, vendorPanelController.toggleAvailability);
router.patch('/:vendorId/items/:itemId/availability', authenticateToken, vendorPanelController.toggleAvailability);
router.put('/:vendorId/items/:itemId/availability', authenticateToken, vendorPanelController.toggleAvailability);

// DELETE /api/vendorPanel/:vendorId/items/:itemId
router.delete('/:vendorId/items/:itemId', authenticateToken, requireVendorOwner, vendorPanelController.deleteItem);

// PUT /api/vendorPanel/payment-details & /:vendorId/payment-details
router.put('/payment-details', vendorPanelController.updatePaymentDetails);
router.put('/:vendorId/payment-details', vendorPanelController.updatePaymentDetails);

// PUT /api/vendorPanel/:vendorId/settings
router.put('/:vendorId/settings', authenticateToken, requireVendorOwner, validateRequest(updateSettingsSchema), vendorPanelController.updateSettings);

// PUT /api/vendorPanel/:vendorId/coverage
router.put('/:vendorId/coverage', authenticateToken, requireVendorOwner, vendorPanelController.updateVendorCoverage);

// POST /api/vendorPanel/:vendorId/renew
router.post('/:vendorId/renew', authenticateToken, requireVendorOwner, vendorPanelController.renewSubscription);

// FCM / Expo Push Device Token Endpoints
router.post('/fcm-token', vendorPanelController.registerFcmToken);
router.post('/:vendorId/fcm-token', vendorPanelController.registerFcmToken);
router.delete('/fcm-token', vendorPanelController.deleteFcmToken);
router.delete('/:vendorId/fcm-token', vendorPanelController.deleteFcmToken);

// DELETE /api/vendorPanel/:vendorId
router.delete('/:vendorId', authenticateToken, requireVendorOwner, vendorPanelController.deleteStore);
router.delete('/:vendorId/store', authenticateToken, requireVendorOwner, vendorPanelController.deleteStore);

module.exports = router;
