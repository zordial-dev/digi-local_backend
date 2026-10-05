const express = require('express');
const router = express.Router();
const ratingController = require('../../controllers/Rating/ratingController');

// ── Customer & Public Storefront Rating Endpoints ────────────────
// Submit Rating & Review
router.post('/api/vendorPanel/:vendorId/ratings', ratingController.submitRating);
router.post('/api/vendors/:vendorId/ratings', ratingController.submitRating);
router.post('/api/vendor/:vendorId/ratings', ratingController.submitRating);
router.post('/api/stores/:vendorId/ratings', ratingController.submitRating);
router.post('/api/ratings', ratingController.submitRating);
router.post('/vendors/:vendorId/ratings', ratingController.submitRating);
router.post('/ratings', ratingController.submitRating);

// Edit Rating & Review
router.put('/api/ratings/:ratingId', ratingController.editReview);
router.patch('/api/ratings/:ratingId', ratingController.editReview);
router.put('/api/reviews/:ratingId', ratingController.editReview);
router.patch('/api/reviews/:ratingId', ratingController.editReview);
router.post('/api/ratings/:ratingId/edit', ratingController.editReview);
router.post('/api/reviews/:ratingId/edit', ratingController.editReview);
router.put('/ratings/:ratingId', ratingController.editReview);
router.patch('/ratings/:ratingId', ratingController.editReview);
router.put('/reviews/:ratingId', ratingController.editReview);
router.patch('/reviews/:ratingId', ratingController.editReview);

// Delete Rating & Review
router.delete('/api/ratings/:ratingId', ratingController.deleteUserReview);
router.delete('/api/reviews/:ratingId', ratingController.deleteUserReview);
router.delete('/ratings/:ratingId', ratingController.deleteUserReview);
router.delete('/reviews/:ratingId', ratingController.deleteUserReview);

// Fetch Vendor Ratings List
router.get('/api/vendorPanel/:vendorId/ratings', ratingController.getVendorRatings);
router.get('/api/vendors/:vendorId/ratings', ratingController.getVendorRatings);
router.get('/api/vendor/:vendorId/ratings', ratingController.getVendorRatings);
router.get('/api/stores/:vendorId/ratings', ratingController.getVendorRatings);
router.get('/api/ratings', ratingController.getVendorRatings);
router.get('/vendors/:vendorId/ratings', ratingController.getVendorRatings);

// Fetch Vendor Rating Summary
router.get('/api/vendorPanel/:vendorId/ratings/summary', ratingController.getVendorRatingSummary);
router.get('/api/vendors/:vendorId/ratings/summary', ratingController.getVendorRatingSummary);
router.get('/api/vendor/:vendorId/ratings/summary', ratingController.getVendorRatingSummary);
router.get('/api/stores/:vendorId/ratings/summary', ratingController.getVendorRatingSummary);
router.get('/vendors/:vendorId/ratings/summary', ratingController.getVendorRatingSummary);

// ── Vendor Web Panel & Mobile App Rating & Reviews Endpoints ───────────────
router.get('/api/vendor/ratings', ratingController.getVendorSelfRatings);
router.get('/api/vendor/reviews', ratingController.getVendorSelfRatings);
router.get('/api/vendorPanel/ratings', ratingController.getVendorSelfRatings);
router.get('/api/vendorPanel/reviews', ratingController.getVendorSelfRatings);
router.get('/api/vendorPanel/:vendorId/reviews', ratingController.getVendorSelfRatings);
router.get('/api/vendors/:vendorId/reviews', ratingController.getVendorSelfRatings);
router.get('/api/vendor/:vendorId/reviews', ratingController.getVendorSelfRatings);
router.get('/vendor/ratings', ratingController.getVendorSelfRatings);
router.get('/vendor/reviews', ratingController.getVendorSelfRatings);

router.post('/api/vendor/ratings/:ratingId/reply', ratingController.replyToRating);
router.post('/api/vendor/reviews/:ratingId/reply', ratingController.replyToRating);
router.post('/api/vendorPanel/ratings/:ratingId/reply', ratingController.replyToRating);
router.post('/api/vendorPanel/reviews/:ratingId/reply', ratingController.replyToRating);
router.post('/vendor/ratings/:ratingId/reply', ratingController.replyToRating);

// ── Admin Panel Rating & Moderation Endpoints ────────────────────
router.get('/api/admin/vendor-ratings', ratingController.getAllAdminRatings);
router.get('/admin/vendor-ratings', ratingController.getAllAdminRatings);

router.patch('/api/admin/vendor-ratings/:ratingId/status', ratingController.updateAdminRatingStatus);
router.patch('/admin/vendor-ratings/:ratingId/status', ratingController.updateAdminRatingStatus);

router.delete('/api/admin/vendor-ratings/:ratingId', ratingController.deleteAdminRating);
router.delete('/admin/vendor-ratings/:ratingId', ratingController.deleteAdminRating);

module.exports = router;
