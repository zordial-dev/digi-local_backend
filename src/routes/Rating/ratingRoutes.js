const express = require('express');
const router = express.Router();
const ratingController = require('../../controllers/Rating/ratingController');
const { authenticateToken, requireUser, requireVendor, requireVendorOwner } = require('../../middleware/auth');
const { authenticateAdminToken } = require('../../middleware/adminAuth');

// ── Customer Rating & Review Submission Endpoints (User Only) ────────
// Submit Rating & Review
router.post('/api/vendorPanel/:vendorId/ratings', authenticateToken, requireUser, ratingController.submitRating);
router.post('/api/vendors/:vendorId/ratings', authenticateToken, requireUser, ratingController.submitRating);
router.post('/api/vendor/:vendorId/ratings', authenticateToken, requireUser, ratingController.submitRating);
router.post('/api/stores/:vendorId/ratings', authenticateToken, requireUser, ratingController.submitRating);
router.post('/api/ratings', authenticateToken, requireUser, ratingController.submitRating);
router.post('/vendors/:vendorId/ratings', authenticateToken, requireUser, ratingController.submitRating);
router.post('/ratings', authenticateToken, requireUser, ratingController.submitRating);

// Edit Rating & Review (User Only)
router.put('/api/ratings/:ratingId', authenticateToken, requireUser, ratingController.editReview);
router.patch('/api/ratings/:ratingId', authenticateToken, requireUser, ratingController.editReview);
router.put('/api/reviews/:ratingId', authenticateToken, requireUser, ratingController.editReview);
router.patch('/api/reviews/:ratingId', authenticateToken, requireUser, ratingController.editReview);
router.post('/api/ratings/:ratingId/edit', authenticateToken, requireUser, ratingController.editReview);
router.post('/api/reviews/:ratingId/edit', authenticateToken, requireUser, ratingController.editReview);
router.put('/ratings/:ratingId', authenticateToken, requireUser, ratingController.editReview);
router.patch('/ratings/:ratingId', authenticateToken, requireUser, ratingController.editReview);
router.put('/reviews/:ratingId', authenticateToken, requireUser, ratingController.editReview);
router.patch('/reviews/:ratingId', authenticateToken, requireUser, ratingController.editReview);

// Delete Rating & Review (User Only)
router.delete('/api/ratings/:ratingId', authenticateToken, requireUser, ratingController.deleteUserReview);
router.delete('/api/reviews/:ratingId', authenticateToken, requireUser, ratingController.deleteUserReview);
router.delete('/ratings/:ratingId', authenticateToken, requireUser, ratingController.deleteUserReview);
router.delete('/reviews/:ratingId', authenticateToken, requireUser, ratingController.deleteUserReview);

// Fetch Vendor Ratings List (Public Read)
router.get('/api/vendorPanel/:vendorId/ratings', ratingController.getVendorRatings);
router.get('/api/vendors/:vendorId/ratings', ratingController.getVendorRatings);
router.get('/api/vendor/:vendorId/ratings', ratingController.getVendorRatings);
router.get('/api/stores/:vendorId/ratings', ratingController.getVendorRatings);
router.get('/api/ratings', ratingController.getVendorRatings);
router.get('/vendors/:vendorId/ratings', ratingController.getVendorRatings);

// Fetch Vendor Rating Summary (Public Read)
router.get('/api/vendorPanel/:vendorId/ratings/summary', ratingController.getVendorRatingSummary);
router.get('/api/vendors/:vendorId/ratings/summary', ratingController.getVendorRatingSummary);
router.get('/api/vendor/:vendorId/ratings/summary', ratingController.getVendorRatingSummary);
router.get('/api/stores/:vendorId/ratings/summary', ratingController.getVendorRatingSummary);
router.get('/vendors/:vendorId/ratings/summary', ratingController.getVendorRatingSummary);

// ── Vendor Web Panel & Mobile App Rating & Reviews Endpoints (Vendor Only) ───
router.get('/api/vendor/ratings', authenticateToken, requireVendor, ratingController.getVendorSelfRatings);
router.get('/api/vendor/reviews', authenticateToken, requireVendor, ratingController.getVendorSelfRatings);
router.get('/api/vendorPanel/ratings', authenticateToken, requireVendor, ratingController.getVendorSelfRatings);
router.get('/api/vendorPanel/reviews', authenticateToken, requireVendor, ratingController.getVendorSelfRatings);
router.get('/api/vendorPanel/:vendorId/reviews', authenticateToken, requireVendorOwner, ratingController.getVendorSelfRatings);
router.get('/api/vendors/:vendorId/reviews', authenticateToken, requireVendorOwner, ratingController.getVendorSelfRatings);
router.get('/api/vendor/:vendorId/reviews', authenticateToken, requireVendorOwner, ratingController.getVendorSelfRatings);
router.get('/vendor/ratings', authenticateToken, requireVendor, ratingController.getVendorSelfRatings);
router.get('/vendor/reviews', authenticateToken, requireVendor, ratingController.getVendorSelfRatings);

router.post('/api/vendor/ratings/:ratingId/reply', authenticateToken, requireVendor, ratingController.replyToRating);
router.post('/api/vendor/reviews/:ratingId/reply', authenticateToken, requireVendor, ratingController.replyToRating);
router.post('/api/vendorPanel/ratings/:ratingId/reply', authenticateToken, requireVendor, ratingController.replyToRating);
router.post('/api/vendorPanel/reviews/:ratingId/reply', authenticateToken, requireVendor, ratingController.replyToRating);
router.post('/vendor/ratings/:ratingId/reply', authenticateToken, requireVendor, ratingController.replyToRating);

// ── Admin Panel Rating & Moderation Endpoints (Admin Only) ────────
router.get('/api/admin/vendor-ratings', authenticateAdminToken, ratingController.getAllAdminRatings);
router.get('/admin/vendor-ratings', authenticateAdminToken, ratingController.getAllAdminRatings);

router.patch('/api/admin/vendor-ratings/:ratingId/status', authenticateAdminToken, ratingController.updateAdminRatingStatus);
router.patch('/admin/vendor-ratings/:ratingId/status', authenticateAdminToken, ratingController.updateAdminRatingStatus);

router.delete('/api/admin/vendor-ratings/:ratingId', authenticateAdminToken, ratingController.deleteAdminRating);
router.delete('/admin/vendor-ratings/:ratingId', authenticateAdminToken, ratingController.deleteAdminRating);

module.exports = router;
