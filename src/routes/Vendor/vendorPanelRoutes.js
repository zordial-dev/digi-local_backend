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
        'image/gif': '.gif', 'image/heic': '.jpg',
        'image/heif': '.jpg', 'image/avif': '.jpg', 'image/bmp': '.bmp', 'image/tiff': '.tiff',
    };
    if (file.mimetype && mimeToExt[file.mimetype.toLowerCase()]) {
        return mimeToExt[file.mimetype.toLowerCase()];
    }
    const extFromName = path.extname(file.originalname || '').toLowerCase();
    if (extFromName === '.avif' || extFromName === '.heic' || extFromName === '.heif') {
        return '.jpg';
    }
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

const ratingController = require('../../controllers/Rating/ratingController');

// GET & POST Vendor Ratings and Reviews in vendorPanel
router.get('/ratings', ratingController.getVendorSelfRatings);
router.get('/reviews', ratingController.getVendorSelfRatings);
router.get('/:vendorId/ratings', ratingController.getVendorSelfRatings);
router.get('/:vendorId/reviews', ratingController.getVendorSelfRatings);
router.get('/:vendorId/ratings/summary', ratingController.getVendorRatingSummary);
router.post('/:vendorId/ratings', ratingController.submitRating);
router.post('/:vendorId/reviews', ratingController.submitRating);
router.post('/ratings/:ratingId/reply', ratingController.replyToRating);
router.post('/reviews/:ratingId/reply', ratingController.replyToRating);

// Direct vendor status check
router.get('/status', vendorAuthController.getVendorStatus);
router.get('/:vendorId/status', vendorAuthController.getVendorStatus);

// GET /api/vendorPanel/:vendorId - Full vendor dashboard data
router.get('/:vendorId', authenticateToken, requireVendorOwner, vendorPanelController.getDashboard);

// GET /api/vendorPanel/:vendorId/purchases & /my-orders - Vendor B2B / B2C orders placed by vendor buying from other vendors
router.get('/:vendorId/purchases', vendorPanelController.getVendorPurchases);
router.get('/:vendorId/my-orders', vendorPanelController.getVendorPurchases);
router.get('/:vendorId/orders-made', vendorPanelController.getVendorPurchases);


// POST /api/vendorPanel/:vendorId/items & /products (Supports multipart/form-data camera/gallery uploads and JSON)
router.post(['/:vendorId/items', '/:vendorId/products'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, validateRequest(addItemSchema), vendorPanelController.addItem);

// PUT/PATCH /api/vendorPanel/:vendorId/items/:itemId & /products/:itemId
router.put(['/:vendorId/items/:itemId', '/:vendorId/products/:itemId'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItem);
router.patch(['/:vendorId/items/:itemId', '/:vendorId/products/:itemId'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItem);

// Dedicated Photo / Image endpoints for items & products
router.post(['/:vendorId/items/:itemId/image', '/:vendorId/products/:itemId/image'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.put(['/:vendorId/items/:itemId/image', '/:vendorId/products/:itemId/image'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.patch(['/:vendorId/items/:itemId/image', '/:vendorId/products/:itemId/image'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.post(['/:vendorId/items/:itemId/photo', '/:vendorId/products/:itemId/photo'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.put(['/:vendorId/items/:itemId/photo', '/:vendorId/products/:itemId/photo'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.patch(['/:vendorId/items/:itemId/photo', '/:vendorId/products/:itemId/photo'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);

// Toggle Item Availability Endpoints
router.patch(['/items/:itemId/availability', '/products/:itemId/availability', '/:vendorId/items/:itemId/availability', '/:vendorId/products/:itemId/availability'], authenticateToken, vendorPanelController.toggleAvailability);
router.put(['/items/:itemId/availability', '/products/:itemId/availability', '/:vendorId/items/:itemId/availability', '/:vendorId/products/:itemId/availability'], authenticateToken, vendorPanelController.toggleAvailability);

// DELETE /api/vendorPanel/:vendorId/items/:itemId & /products/:itemId
router.delete(['/:vendorId/items/:itemId', '/:vendorId/products/:itemId'], authenticateToken, requireVendorOwner, vendorPanelController.deleteItem);

// PUT /api/vendorPanel/payment-details & /:vendorId/payment-details
router.put('/payment-details', vendorPanelController.updatePaymentDetails);
router.put('/:vendorId/payment-details', vendorPanelController.updatePaymentDetails);

// PUT/POST/PATCH /api/vendorPanel/:vendorId/settings, /profile, and /:vendorId directly
router.put(['/:vendorId/settings', '/:vendorId/profile', '/:vendorId'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, validateRequest(updateSettingsSchema), vendorPanelController.updateSettings);
router.post(['/:vendorId/settings', '/:vendorId/profile', '/:vendorId'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, validateRequest(updateSettingsSchema), vendorPanelController.updateSettings);
router.patch(['/:vendorId/settings', '/:vendorId/profile', '/:vendorId'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, validateRequest(updateSettingsSchema), vendorPanelController.updateSettings);

// PUT /api/vendorPanel/:vendorId/coverage
router.put('/:vendorId/coverage', authenticateToken, requireVendorOwner, vendorPanelController.updateVendorCoverage);

// POST /api/vendorPanel/:vendorId/renew
router.post('/:vendorId/renew', authenticateToken, requireVendorOwner, vendorPanelController.renewSubscription);

// FCM / Expo Push Device Token Endpoints
router.post('/fcm-token', vendorPanelController.registerFcmToken);
router.post('/:vendorId/fcm-token', vendorPanelController.registerFcmToken);
router.delete('/fcm-token', vendorPanelController.deleteFcmToken);
router.delete('/:vendorId/fcm-token', vendorPanelController.deleteFcmToken);

const supportController = require('../../controllers/Support/supportController');

// Vendor Support Desk Tickets (vendor-portal)
router.post('/tickets', supportController.createVendorTicket);
router.get('/tickets', supportController.getVendorTickets);

module.exports = router;

