const express = require('express');
const router = express.Router();
const usersController = require('../../controllers/User/usersController');

const { authenticateToken } = require('../../middleware/auth');

// B0. Send OTP to Resident User Phone or Email
router.post('/send-otp', usersController.sendOtp);

// B0.1 Verify Resident User OTP
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
router.post('/tickets', supportController.createCustomerTicket);
router.get('/tickets', supportController.getUserTickets);
router.post(['/tickets/:ticketId/reply', '/tickets/:id/reply'], supportController.userReplyToTicket);

module.exports = router;

