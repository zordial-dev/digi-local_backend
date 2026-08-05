const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const vendorPanelController = require('../controllers/vendorPanelController');
const { authenticateToken, requireVendorOwner } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { addItemSchema, updateSettingsSchema } = require('../schemas/vendorSchema');

// ── Multer Storage Config ────────────────────────────────────
const storage = multer.diskStorage({
    destination: path.join(__dirname, '../../public/uploads'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const unique = `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, unique);
    }
});
const fileFilter = (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed (jpg, png, webp, gif)'));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// POST /api/vendorPanel/upload-image - Upload item image
router.post('/upload-image', upload.single('image'), vendorPanelController.uploadImage);

// GET /api/vendorPanel/:vendorId - Full vendor dashboard data
router.get('/:vendorId', authenticateToken, requireVendorOwner, vendorPanelController.getDashboard);

// POST /api/vendorPanel/:vendorId/items - Add item
router.post('/:vendorId/items', authenticateToken, requireVendorOwner, validateRequest(addItemSchema), vendorPanelController.addItem);

// PUT /api/vendorPanel/:vendorId/items/:itemId - Edit item or toggle availability
router.put('/:vendorId/items/:itemId', authenticateToken, requireVendorOwner, vendorPanelController.updateItem);

// DELETE /api/vendorPanel/:vendorId/items/:itemId - Delete item
router.delete('/:vendorId/items/:itemId', authenticateToken, requireVendorOwner, vendorPanelController.deleteItem);

// PUT /api/vendorPanel/:vendorId/settings - Update store settings
router.put('/:vendorId/settings', authenticateToken, requireVendorOwner, validateRequest(updateSettingsSchema), vendorPanelController.updateSettings);

// POST /api/vendorPanel/:vendorId/renew - Renew vendor subscription
router.post('/:vendorId/renew', authenticateToken, requireVendorOwner, vendorPanelController.renewSubscription);

module.exports = router;
