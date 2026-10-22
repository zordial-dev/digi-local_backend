const express = require('express');
const router = express.Router();
const usersController = require('../../controllers/User/usersController');
const otpController = require('../../controllers/otpController');

const { authenticateToken, requireUser, requireUserOwner } = require('../../middleware/auth');
const ratingController = require('../../controllers/Rating/ratingController');

// Middleware: force role='user' on user-scoped OTP routes so the guard always checks only the users table
function injectUserRole(req, res, next) {
  if (!req.body) req.body = {};
  req.body.role = 'user';
  next();
}

// Dedicated Mobile OTP Routes
router.post(['/mobile/send-otp', '/mobile/send'], injectUserRole, otpController.sendMobileOtp);
router.post(['/mobile/verify-otp', '/mobile/verify'], injectUserRole, otpController.verifyMobileOtp);

// Dedicated Email OTP Routes
router.post(['/email/send-otp', '/email/send'], injectUserRole, otpController.sendEmailOtp);
router.post(['/email/verify-otp', '/email/verify'], injectUserRole, otpController.verifyEmailOtp);

// Universal / Legacy OTP Routes
router.post('/send-otp', usersController.sendOtp);
router.post('/verify-otp', usersController.verifyOtp);

// B0.2 Check if User or Vendor Account Exists
router.post(['/check-account', '/check-exists', '/check-user', '/check-phone'], usersController.checkAccountExists);

// B1. Resident User Login
router.post('/login', usersController.loginUser);

// B2. Resident User Registration
router.post('/register', usersController.registerUser);

// B2.1 Fetch Logged-In Resident User Profile & Status Check (User Only)
router.get('/status', authenticateToken, requireUser, usersController.getUserStatus);
router.get('/status/:userId', authenticateToken, requireUserOwner, usersController.getUserStatus);
router.get('/:userId/status', authenticateToken, requireUserOwner, usersController.getUserStatus);
router.get('/profile', authenticateToken, requireUser, usersController.getUserProfile);
router.get('/me', authenticateToken, requireUser, usersController.getUserProfile);
router.get('/strikes', authenticateToken, requireUser, usersController.getUserStrikes);
router.get('/strikes/:userId', authenticateToken, requireUserOwner, usersController.getUserStrikes);
router.get('/:userId/strikes', authenticateToken, requireUserOwner, usersController.getUserStrikes);

// B2.1 Update Resident User Profile & Address (User Only)
router.put('/profile', authenticateToken, requireUser, usersController.updateUserProfile);
router.patch('/profile', authenticateToken, requireUser, usersController.updateUserProfile);
router.put('/address', authenticateToken, requireUser, usersController.updateUserProfile);
router.post('/address', authenticateToken, requireUser, usersController.updateUserProfile);
router.put('/me', authenticateToken, requireUser, usersController.updateUserProfile);
router.put('/:userId', authenticateToken, requireUserOwner, usersController.updateUserProfile);
router.put('/:userId/address', authenticateToken, requireUserOwner, usersController.updateUserProfile);

// B2.2 Delete Resident User Account (User Only)
router.delete('/profile', authenticateToken, requireUser, usersController.deleteAccount);
router.delete('/me', authenticateToken, requireUser, usersController.deleteAccount);
router.delete('/delete', authenticateToken, requireUser, usersController.deleteAccount);
router.delete('/account', authenticateToken, requireUser, usersController.deleteAccount);
router.post('/delete-account', authenticateToken, requireUser, usersController.deleteAccount);
router.post('/delete', authenticateToken, requireUser, usersController.deleteAccount);
router.delete('/:userId', authenticateToken, requireUserOwner, usersController.deleteAccount);

const enquiryController = require('../../controllers/Vendor/enquiryController');
const supportController = require('../../controllers/Support/supportController');

// B3. Fetch Resident User Orders (User Owner Only)
router.get('/:userId/orders', authenticateToken, requireUserOwner, usersController.getUserOrders);

// B3.1 Fetch Resident User Reviews (with vendor reply)
router.get('/my-reviews', authenticateToken, requireUser, ratingController.getMyReviews);
router.get('/:userId/reviews', authenticateToken, requireUserOwner, ratingController.getMyReviews);
router.get('/reviews', authenticateToken, requireUser, ratingController.getMyReviews);
router.put(['/reviews/:ratingId', '/ratings/:ratingId'], authenticateToken, requireUser, ratingController.editReview);
router.patch(['/reviews/:ratingId', '/ratings/:ratingId'], authenticateToken, requireUser, ratingController.editReview);
router.delete(['/reviews/:ratingId', '/ratings/:ratingId'], authenticateToken, requireUser, ratingController.deleteUserReview);

// B4. Fetch Resident User Service Enquiries (User Owner Only)
router.get('/:userId/enquiries', authenticateToken, requireUserOwner, enquiryController.getUserEnquiries);

// B5. Resident User Support Tickets (user-app)
router.post('/tickets', authenticateToken, requireUser, supportController.createCustomerTicket);
router.get('/tickets', authenticateToken, requireUser, supportController.getUserTickets);
router.post(['/tickets/:ticketId/reply', '/tickets/:id/reply'], authenticateToken, requireUser, supportController.userReplyToTicket);

module.exports = router;

