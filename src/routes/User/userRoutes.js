const express = require('express');
const router = express.Router();
const usersController = require('../../controllers/User/usersController');
const otpController = require('../../controllers/otpController');

const { authenticateToken } = require('../../middleware/auth');

// Dedicated Mobile OTP Routes
router.post(['/mobile/send-otp', '/mobile/send'], otpController.sendMobileOtp);
router.post(['/mobile/verify-otp', '/mobile/verify'], otpController.verifyMobileOtp);

// Dedicated Email OTP Routes
router.post(['/email/send-otp', '/email/send'], otpController.sendEmailOtp);
router.post(['/email/verify-otp', '/email/verify'], otpController.verifyEmailOtp);

// Universal / Legacy OTP Routes
router.post('/send-otp', usersController.sendOtp);
router.post('/verify-otp', usersController.verifyOtp);

// B0.2 Check Resident User Phone Registration
router.post('/check-phone', usersController.checkPhone);

// B1. Resident User Login
router.post('/login', usersController.loginUser);

// B2. Resident User Registration
router.post('/register', usersController.registerUser);

// B2.1 Fetch Logged-In Resident User Profile & Status Check
router.get('/status', usersController.getUserStatus);
router.get('/status/:userId', usersController.getUserStatus);
router.get('/:userId/status', usersController.getUserStatus);
router.get('/profile', usersController.getUserProfile);
router.get('/me', usersController.getUserProfile);
router.get('/strikes', usersController.getUserStrikes);
router.get('/strikes/:userId', usersController.getUserStrikes);
router.get('/:userId/strikes', usersController.getUserStrikes);

// B2.1 Update Resident User Profile & Address
router.put('/profile', usersController.updateUserProfile);
router.patch('/profile', usersController.updateUserProfile);
router.put('/address', usersController.updateUserProfile);
router.post('/address', usersController.updateUserProfile);
router.put('/me', usersController.updateUserProfile);
router.put('/:userId', usersController.updateUserProfile);
router.put('/:userId/address', usersController.updateUserProfile);

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

// B4. Fetch Resident User Service Enquiries
router.get('/:userId/enquiries', enquiryController.getUserEnquiries);

// B5. Resident User Support Tickets (user-app)
router.post('/tickets', authenticateToken, supportController.createCustomerTicket);
router.get('/tickets', authenticateToken, supportController.getUserTickets);
router.post(['/tickets/:ticketId/reply', '/tickets/:id/reply'], authenticateToken, supportController.userReplyToTicket);

module.exports = router;

