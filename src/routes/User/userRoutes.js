const express = require('express');
const router = express.Router();
const usersController = require('../../controllers/User/usersController');
const otpController = require('../../controllers/otpController');

const { authenticateToken } = require('../../middleware/auth');
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

// B2.1 Fetch Logged-In Resident User Profile & Status Check
router.get('/status', authenticateToken, usersController.getUserStatus);
router.get('/status/:userId', authenticateToken, usersController.getUserStatus);
router.get('/:userId/status', authenticateToken, usersController.getUserStatus);
router.get('/profile', authenticateToken, usersController.getUserProfile);
router.get('/me', authenticateToken, usersController.getUserProfile);
router.get('/strikes', authenticateToken, usersController.getUserStrikes);
router.get('/strikes/:userId', authenticateToken, usersController.getUserStrikes);
router.get('/:userId/strikes', authenticateToken, usersController.getUserStrikes);

// B2.1 Update Resident User Profile & Address
router.put('/profile', authenticateToken, usersController.updateUserProfile);
router.patch('/profile', authenticateToken, usersController.updateUserProfile);
router.put('/address', authenticateToken, usersController.updateUserProfile);
router.post('/address', authenticateToken, usersController.updateUserProfile);
router.put('/me', authenticateToken, usersController.updateUserProfile);
router.put('/:userId', authenticateToken, usersController.updateUserProfile);
router.put('/:userId/address', authenticateToken, usersController.updateUserProfile);

// B2.2 Delete Resident User Account
router.delete('/profile', authenticateToken, usersController.deleteAccount);
router.delete('/me', authenticateToken, usersController.deleteAccount);
router.delete('/delete', authenticateToken, usersController.deleteAccount);
router.delete('/account', authenticateToken, usersController.deleteAccount);
router.post('/delete-account', authenticateToken, usersController.deleteAccount);
router.post('/delete', authenticateToken, usersController.deleteAccount);
router.delete('/:userId', authenticateToken, usersController.deleteAccount);

const enquiryController = require('../../controllers/Vendor/enquiryController');
const supportController = require('../../controllers/Support/supportController');

// B3. Fetch Resident User Orders
router.get('/:userId/orders', usersController.getUserOrders);

// B3.1 Fetch Resident User Reviews (with vendor reply)
router.get('/my-reviews', authenticateToken, ratingController.getMyReviews);
router.get('/:userId/reviews', authenticateToken, ratingController.getMyReviews);
router.get('/reviews', authenticateToken, ratingController.getMyReviews);

// B4. Fetch Resident User Service Enquiries
router.get('/:userId/enquiries', enquiryController.getUserEnquiries);

// B5. Resident User Support Tickets (user-app)
router.post('/tickets', authenticateToken, supportController.createCustomerTicket);
router.get('/tickets', authenticateToken, supportController.getUserTickets);
router.post(['/tickets/:ticketId/reply', '/tickets/:id/reply'], authenticateToken, supportController.userReplyToTicket);

module.exports = router;

