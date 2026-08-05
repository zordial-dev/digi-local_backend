const z = require('../utils/zod');

const registerSchema = {
  body: z.object({
    society_id: z.union([z.number(), z.string()]).optional(),
    society: z.union([z.number(), z.string()]).optional(),
    society_name: z.string().optional(),
    societyName: z.string().optional(),
    vendor_name: z.string().optional(),
    owner_name: z.string().optional(),
    ownerName: z.string().optional(),
    vendorName: z.string().optional(),
    name: z.string().optional(),
    owner: z.string().optional(),
    email: z.string().trim().optional(),
    email_address: z.string().optional(),
    emailAddress: z.string().optional(),
    password: z.string().optional(),
    pass: z.string().optional(),
    create_password: z.string().optional(),
    store_name: z.string().optional(),
    shop_name: z.string().optional(),
    business_name: z.string().optional(),
    storeName: z.string().optional(),
    shopName: z.string().optional(),
    businessName: z.string().optional(),
    gst_number: z.string().optional(),
    gstNumber: z.string().optional(),
    gst: z.string().optional(),
    phone_number: z.string().optional(),
    mobile_number: z.string().optional(),
    mobile: z.string().optional(),
    phone: z.string().optional(),
    phoneNumber: z.string().optional(),
    mobileNumber: z.string().optional(),
    category: z.string().optional(),
    business_category: z.string().optional(),
    businessCategory: z.string().optional(),
    address: z.string().optional(),
    shop_address: z.string().optional(),
    shopAddress: z.string().optional(),
    city: z.string().optional(),
    pincode: z.union([z.number(), z.string()]).optional(),
    pin_code: z.union([z.number(), z.string()]).optional(),
    pinCode: z.union([z.number(), z.string()]).optional(),
    payment_method: z.string().optional(),
    transaction_id: z.string().optional()
  }).passthrough()
};

const loginSchema = {
  body: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    identifier: z.string().optional(),
    password: z.string().optional(),
    otp: z.string().optional()
  }).passthrough()
};

const forgotPasswordSchema = {
  body: z.object({
    email: z.string().trim().email('Valid email address is required')
  }).passthrough()
};

const verifyOtpSchema = {
  body: z.object({
    email: z.string().trim().email('Valid email address is required'),
    otp: z.string().trim().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits')
  }).passthrough()
};

const resetPasswordSchema = {
  body: z.object({
    email: z.string().trim().email('Valid email address is required'),
    otp: z.string().trim().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters long')
  }).passthrough()
};

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema
};
