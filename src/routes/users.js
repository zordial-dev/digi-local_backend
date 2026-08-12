const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');

const { authenticateToken } = require('../middleware/auth');

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

// B2.1 Fetch Logged-In Resident User Profile
router.get('/profile', authenticateToken, usersController.getUserProfile);
router.get('/me', authenticateToken, usersController.getUserProfile);

// B2.2 Delete Resident User Account
router.delete('/profile', authenticateToken, usersController.deleteAccount);
router.delete('/me', authenticateToken, usersController.deleteAccount);
router.delete('/:userId', authenticateToken, usersController.deleteAccount);

// B3. Fetch Resident User Orders
router.get('/:userId/orders', usersController.getUserOrders);

module.exports = router;
