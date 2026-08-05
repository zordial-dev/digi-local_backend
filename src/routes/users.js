const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');

const { authenticateToken } = require('../middleware/auth');

// B0. Send OTP to Resident User Phone or Email
router.post('/send-otp', usersController.sendOtp);

// B0.1 Verify Resident User OTP
router.post('/verify-otp', usersController.verifyOtp);

// B1. Resident User Login
router.post('/login', usersController.loginUser);

// B2. Resident User Registration
router.post('/register', usersController.registerUser);

// B2.1 Fetch Logged-In Resident User Profile
router.get('/profile', authenticateToken, usersController.getUserProfile);
router.get('/me', authenticateToken, usersController.getUserProfile);

// B3. Fetch Resident User Orders
router.get('/:userId/orders', usersController.getUserOrders);

module.exports = router;
