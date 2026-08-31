const { query } = require('../../models/db');
const {
    hashPassword,
    comparePassword,
    generateTokens,
    revokeToken,
    generateOTP,
    verifyOTP,
    normalizePhone
} = require('../../utils/auth');
const { sendOTP: sendMsg91OTP, verifyOTP: verifyMsg91OTP } = require('../../services/msg91Service');
const { recordFailedAttempt, resetFailedAttempts } = require('../../middleware/security');
const { sendEmail } = require('../../services/emailService');
const { vendorWelcomeEmail } = require('../../templates/vendorWelcomeEmail');

const { normalizeImageUrl } = require('../../utils/imageUtils');

/**
 * GET /api/vendors/:id - Fetch Vendor Storefront Profile & Catalog Items
 */
async function getVendorPublicProfile(req, res) {
    try {
        const { id } = req.params;

        if (!id || id === 'all' || id === 'nearby' || id === 'list' || id === 'public' || id === 'storefront' || id === 'society') {
            const adminPanelController = require('../Admin/adminPanelController');
            return adminPanelController.listVendors(req, res);
        }

        const vendorRes = await query(
            `SELECT * FROM vendors 
             WHERE (CAST(vendor_id AS TEXT) = ? OR public_id = ? OR LOWER(email) = LOWER(?)) AND LOWER(COALESCE(status, 'active')) IN ('active', 'approved')`,
            [id, id, id]
        );
        if (vendorRes.rows.length === 0) {
            // Try matching without status restriction if active query returned nothing
            const fallbackRes = await query(
                `SELECT * FROM vendors WHERE CAST(vendor_id AS TEXT) = ? OR public_id = ? OR LOWER(email) = LOWER(?)`,
                [id, id, id]
            );
            if (!fallbackRes.rows || fallbackRes.rows.length === 0) {
                return res.status(404).json({ success: false, error: `Vendor store ID "${id}" not found` });
            }
            vendorRes.rows = fallbackRes.rows;
        }

        const vendor = vendorRes.rows[0];

        const itemsRes = await query(
            `SELECT item_id, item_name, price, category, description, image_url, in_stock 
             FROM items 
             WHERE vendor_id = ? OR vendor_id IN (SELECT vendor_id FROM vendors WHERE LOWER(email) = LOWER(?))
             ORDER BY item_id ASC`,
            [vendor.vendor_id, vendor.email]
        );

        const items = itemsRes.rows.map(item => ({
            item_id: Number(item.item_id),
            item_name: item.item_name,
            description: item.description,
            price: Number(item.price),
            stock: item.stock !== undefined ? Number(item.stock) : 100,
            category: item.category || 'General',
            image_url: item.image_url ? normalizeImageUrl(item.image_url) : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
            in_stock: Boolean(item.in_stock)
        }));

        res.status(200).json({
            vendor_id: Number(vendor.vendor_id),
            store_name: vendor.store_name,
            vendor_name: vendor.vendor_name,
            owner_name: vendor.owner_name || vendor.vendor_name,
            email: vendor.email,
            phone_number: vendor.phone_number,
            gst_number: vendor.gst_number || vendor.gstin,
            opening_time: vendor.opening_time || vendor.opening_timing || '08:00 AM',
            closing_time: vendor.closing_time || vendor.closing_timing || '10:00 PM',
            logo: vendor.logo || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
            description: vendor.description,
            society_id: Number(vendor.society_id),
            vendor_type: vendor.vendor_type || 'product',
            can_add_items: vendor.can_add_items !== false && (vendor.vendor_type || 'product') === 'product',
            location_type: vendor.location_type || 'society',
            is_global_coverage: Boolean(vendor.is_global_coverage),
            delivery_radius_km: Number(vendor.delivery_radius_km || 0),
            selected_zones: typeof vendor.selected_zones === 'string' ? (JSON.parse(vendor.selected_zones || '[]')) : (vendor.selected_zones || []),
            status: vendor.status,
            items
        });
    } catch (err) {
        console.error('Error fetching vendor details:', err);
        res.status(500).json({ error: 'Failed to fetch vendor details' });
    }
}

/**
 * POST /api/vendors/send-otp
 * Triggers 6-digit SMS OTP via MSG91 to specified mobile number.
 */
async function sendVendorOtp(req, res) {
    try {
        const { email, phone, mobile, identifier, phone_number, mobile_number, purpose, type, country_code, countryCode } = req.body;
        const target = phone || mobile || phone_number || mobile_number || identifier || email;

        if (!target) {
            return res.status(400).json({ error: 'Mobile number or email is required for OTP' });
        }

        const cleanTarget = String(target).trim();
        const cleanPhoneDigits = cleanTarget.replace(/[^0-9]/g, '');
        const last10 = cleanPhoneDigits.length >= 10 ? cleanPhoneDigits.slice(-10) : cleanPhoneDigits;
        const mode = (purpose || type || '').toLowerCase();
        const isRegistrationIntent = mode === 'register' || mode === 'signup' || mode === 'check_register';

        const vendorRes = await query(
            `SELECT vendor_id FROM vendors WHERE phone_number = ? OR phone_number = ? OR phone_number = ? OR phone_number LIKE ? OR LOWER(email) = LOWER(?)`,
            [cleanTarget, cleanPhoneDigits, last10, `%${last10}`, cleanTarget]
        );

        const vendorExists = vendorRes.rows && vendorRes.rows.length > 0;

        if (isRegistrationIntent) {
            if (vendorExists) {
                return res.status(400).json({
                    success: false,
                    exists: true,
                    error: 'A vendor account with this mobile number/email already exists. Please log in instead.'
                });
            }
        } else {
            if (!vendorExists) {
                console.log(`⚠️ [VENDOR SEND OTP BLOCKED] Account "${cleanTarget}" not found in database. Disallowing OTP send.`);
                return res.status(404).json({
                    success: false,
                    exists: false,
                    error: 'No vendor account found with this mobile number/email. Please register your vendor account first.'
                });
            }
        }

        const msg91Result = await sendMsg91OTP(cleanTarget, country_code || countryCode);

        res.status(200).json({
            success: true,
            provider: 'msg91',
            message: 'OTP sent successfully via MSG91 SMS',
            target: cleanTarget,
            data: msg91Result
        });
    } catch (err) {
        console.error('❌ [VENDOR MSG91 OTP ERROR] Error sending vendor OTP:', err);
        res.status(500).json({ error: err.message || 'Failed to send OTP via MSG91' });
    }
}

/**
 * POST /api/vendors/check-phone, /api/vendors/check-vendor, /api/vendors/check-mobile
 * Checks if Vendor Account exists for phone number or email.
 */
async function checkVendorPhone(req, res) {
    try {
        const { phone, identifier, mobile, email, phone_number, mobile_number } = req.body;
        const target = String(phone || identifier || mobile || email || phone_number || mobile_number || '').trim();

        if (!target) {
            return res.status(400).json({ error: 'Phone number or email is required' });
        }

        const cleanPhone = normalizePhone(target);
        const cleanEmail = target.toLowerCase();

        const vendorRes = await query(
            `SELECT vendor_id, store_name, vendor_name, email, phone_number, status,
                    account_number, ifsc_code, bank_name, account_holder_name, upi_id 
             FROM vendors 
             WHERE (LOWER(email) = ? AND email != '') 
                OR (RIGHT(REGEXP_REPLACE(phone_number, '\\D', 'g', 'g'), 10) = ? AND phone_number != '')`,
            [cleanEmail, cleanPhone]
        );

        const exists = vendorRes.rows && vendorRes.rows.length > 0;
        const vendor = exists ? vendorRes.rows[0] : null;

        if (!exists) {
            return res.status(404).json({
                exists: false,
                registered: false,
                message: 'No vendor store account found with this mobile number or email.'
            });
        }

        res.status(200).json({
            success: true,
            exists: true,
            registered: true,
            message: 'Vendor account found',
            vendor_id: Number(vendor.vendor_id),
            id: Number(vendor.vendor_id),
            store_name: vendor.store_name,
            vendor_name: vendor.vendor_name,
            phone_number: vendor.phone_number,
            email: vendor.email,
            account_number: vendor.account_number || '',
            ifsc_code: vendor.ifsc_code || '',
            bank_name: vendor.bank_name || '',
            account_holder_name: vendor.account_holder_name || vendor.vendor_name || '',
            upi_id: vendor.upi_id || '',
            vendor: {
                vendor_id: Number(vendor.vendor_id),
                id: Number(vendor.vendor_id),
                store_name: vendor.store_name,
                vendor_name: vendor.vendor_name,
                phone_number: vendor.phone_number,
                email: vendor.email,
                account_number: vendor.account_number || '',
                ifsc_code: vendor.ifsc_code || '',
                bank_name: vendor.bank_name || '',
                account_holder_name: vendor.account_holder_name || vendor.vendor_name || '',
                upi_id: vendor.upi_id || ''
            }
        });
    } catch (err) {
        console.error('Error checking vendor phone registration:', err);
        res.status(500).json({ error: 'Failed to check vendor phone registration' });
    }
}

/**
 * POST /api/vendors/register
 */
async function registerVendor(req, res) {
    try {
        const body = req.body || {};

        const rawAddress = String(
            body.address || body.street_address || body.shop_address ||
            body.full_address || body.address_line1 || body.addressLine1 ||
            body.shop_number || body.shopNumber || body.shop_no || ''
        ).trim();

        const vendor_name = String(
            body.vendor_name || body.owner_name || body.ownerName ||
            body.vendorName || body.name || body.owner || ''
        ).trim();

        const store_name = String(
            body.store_name || body.shop_name || body.business_name ||
            body.storeName || body.shopName || body.businessName || ''
        ).trim();

        const email = String(
            body.email || body.email_address || body.emailAddress || ''
        ).trim();

        const password = String(
            body.password || body.pass || body.create_password || ''
        );

        let phone_number = String(
            body.phone_number || body.mobile_number || body.mobile ||
            body.phone || body.phoneNumber || body.mobileNumber || ''
        ).trim();

        const area = String(
            body.area || body.society_name || body.location_name || body.society || ''
        ).trim();

        const city = String(body.city || '').trim();
        const state = String(body.state || '').trim();
        const pincode = String(body.pincode || body.pin_code || body.pinCode || '').trim();

        const whatsapp_number = String(
            body.whatsapp_number || body.whatsapp || body.merchant_whatsapp || ''
        ).trim();

        const shop_number = String(
            body.shop_number || body.shopNumber || body.shop_no || ''
        ).trim();

        const shop_image = String(
            body.shop_image || body.logo || body.shop_images?.[0] || body.images?.[0] || body.shopImage || ''
        ).trim();

        // Mandatory Validations
        if (!vendor_name) return res.status(400).json({ error: 'Vendor / owner_name is required for registration.' });
        if (!store_name) return res.status(400).json({ error: 'Store / shop_name is required for registration.' });
        if (!email) return res.status(400).json({ error: 'Email address is required for registration.' });
        if (!phone_number) return res.status(400).json({ error: 'Phone number is required for registration.' });
        if (!password) return res.status(400).json({ error: 'Password is a mandatory field for vendor registration.' });
        if (!area) return res.status(400).json({ error: 'Area / location is a mandatory field for vendor registration.' });
        if (!city) return res.status(400).json({ error: 'City is a mandatory field for vendor registration.' });
        if (!state) return res.status(400).json({ error: 'State is a mandatory field for vendor registration.' });
        if (!pincode) return res.status(400).json({ error: 'Pincode is a mandatory field for vendor registration.' });
        if (!whatsapp_number) return res.status(400).json({ error: 'WhatsApp number is a mandatory field for vendor registration.' });
        if (!shop_number) return res.status(400).json({ error: 'Shop number / address is a mandatory field for vendor registration.' });
        if (!shop_image) return res.status(400).json({ error: 'Shop photo / image is a mandatory field for vendor registration.' });

        const gstin = String(body.gstin || body.gst_number || body.gstNumber || body.gst || '').trim();
        const pan_number = String(body.pan_number || body.pan || body.panNumber || '').trim();

        if (!gstin && !pan_number) {
            return res.status(400).json({ error: 'GSTIN or PAN number is a mandatory field for vendor registration.' });
        }

        // Optional Fields
        const category = String(body.category || body.business_category || body.businessCategory || 'General').trim();
        const account_number = String(body.account_number || body.bank_account_number || body.accountNumber || '').trim();
        const ifsc_code = String(body.ifsc_code || body.ifsc || body.ifscCode || '').trim().toUpperCase();
        const bank_name = String(body.bank_name || body.bankName || body.bank || '').trim();
        const account_holder_name = String(body.account_holder_name || body.accountHolderName || vendor_name || '').trim();
        const upi_id = String(body.upi_id || body.upiId || body.upi || '').trim();
        const qr_code_url = String(body.qr_code_url || body.qr_code || body.upi_qr_code || body.qrCodeUrl || '').trim();

        const hashedPassword = await hashPassword(password);
        const defaultDesc = `Welcome to ${store_name}! ${category} daily essentials sourced for DigiLocal residents.`;

        let society_id = 1;
        const rawSociety = body.society_id || body.societyId || body.society || body.society_name || body.societyName;

        if (typeof rawSociety === 'number' && rawSociety > 0) {
            society_id = rawSociety;
        } else if (rawSociety) {
            const rawStr = String(rawSociety).trim();
            if (/^\d+$/.test(rawStr)) {
                society_id = parseInt(rawStr, 10);
            } else {
                const foundSoc = await query(`SELECT society_id FROM societies WHERE LOWER(society_name) = LOWER(?)`, [rawStr]);
                if (foundSoc.rows && foundSoc.rows.length > 0) {
                    society_id = Number(foundSoc.rows[0].society_id);
                } else {
                    const newSocLocation = address ? `${address}, ${city || 'City'}` : (city || 'Local Area');
                    const newSocRes = await query(
                        `INSERT INTO societies (society_name, location, secretary_name, secretary_mobile) VALUES (?, ?, ?, ?) RETURNING *`,
                        [rawStr, newSocLocation, vendor_name, phone_number]
                    );
                    society_id = Number(newSocRes.rows[0]?.society_id || newSocRes.insertId || 1);
                }
            }
        }

        // Check for existing shop with same store_name (shop name) in the same society
        if (store_name) {
            const nameDuplicate = await query(
                `SELECT vendor_id FROM vendors WHERE society_id = ? AND LOWER(TRIM(store_name)) = LOWER(TRIM(?))`,
                [society_id, store_name]
            );
            if (nameDuplicate.rows && nameDuplicate.rows.length > 0) {
                return res.status(400).json({ error: 'A shop with this name already exists in this society.' });
            }
        }

        // New Location & Address Model (Area, City, State, Pincode)
        const vendorLocation = String(body.location || body.area || body.location_name || address || '').trim();
        const vendorCity = String(body.city || city || '').trim();
        const vendorState = String(body.state || state || '').trim();
        const vendorPincode = String(body.pincode || pincode || '').trim();

        // Parse Vendor Classification & Zone Coverage Model
        const rawVendorType = String(body.vendor_type || body.vendorType || body.business_type || 'product').toLowerCase().trim();
        const vendor_type = rawVendorType === 'service' ? 'service' : 'product';
        const can_add_items = vendor_type === 'product';

        const rawLocType = String(body.location_type || body.locationType || '').toLowerCase().trim();
        const location_type = (rawLocType === 'area_sector' || rawLocType === 'area') ? 'area_sector' : 'society';

        const is_global_coverage = Boolean(body.is_global_coverage || body.isGlobalCoverage || body.go_global || body.is_global);
        const delivery_radius_km = Number(body.delivery_radius_km || body.deliveryRadiusKm || body.radius || (is_global_coverage ? 3 : 0));

        let selected_zones = body.selected_zones || [];
        if (typeof selected_zones === 'string') {
            try { selected_zones = JSON.parse(selected_zones); } catch (_) { selected_zones = []; }
        }
        const selected_zones_json = JSON.stringify(Array.isArray(selected_zones) ? selected_zones : []);
        const accepted_payment_methods = JSON.stringify(body.accepted_payment_methods || body.payment_methods || ['UPI', 'COD']);
        const payment_instructions = String(body.payment_instructions || body.instructions || '').trim();

        const kolkataISTNow = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T');

        const vendorRes = await query(
            `INSERT INTO vendors (society_id, vendor_name, gst_number, phone_number, email, password, password_hash, store_name, category, address, location, city, state, pincode, logo, description, account_number, bank_account_number, ifsc_code, ifsc, bank_name, account_holder_name, upi_id, qr_code_url, upi_qr_code, qr_code, whatsapp_number, accepted_payment_methods, payment_instructions, vendor_type, can_add_items, location_type, is_global_coverage, delivery_radius_km, selected_zones, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?) RETURNING *`,
            [society_id, vendor_name, gstin || pan_number || '', phone_number, email || `${Date.now()}@vendor.digilocal`, hashedPassword, hashedPassword, store_name, category, rawAddress || shop_number || area || vendorLocation || '', vendorLocation, vendorCity, vendorState, vendorPincode, shop_image || '', defaultDesc, account_number, account_number, ifsc_code, ifsc_code, bank_name, account_holder_name, upi_id, qr_code_url, qr_code_url, qr_code_url, whatsapp_number, accepted_payment_methods, payment_instructions, vendor_type, can_add_items, location_type, is_global_coverage, delivery_radius_km, selected_zones_json, kolkataISTNow]
        );
        const newVendorRow = vendorRes.rows[0] || {};
        const vendor_id = Number(newVendorRow.vendor_id || vendorRes.insertId);

        // Store in locations table for area lookup & autocompletion
        if (vendorLocation) {
            await query(
                `INSERT INTO locations (area, city, state, pincode) VALUES (?, ?, ?, ?)`,
                [vendorLocation, vendorCity || 'N/A', vendorState || 'N/A', vendorPincode || '000000']
            ).catch(() => { });
        }

        if (!vendor_id || isNaN(vendor_id)) {
            throw new Error('Failed to obtain vendor ID during registration');
        }

        const subRes = await query(
            `INSERT INTO subscriptions (vendor_id, start_date, end_date, status) VALUES (?, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'PENDING') RETURNING *`,
            [vendor_id]
        );
        const subRow = subRes.rows[0] || {};
        const subscription_id = subRow.subscription_id || subRow.id || subRes.insertId;

        const txnId = body.transaction_id || body.transactionId || `RAZORPAY_${Date.now()}_${vendor_id}`;
        const payMethod = body.payment_method || body.paymentMethod || 'Razorpay (UPI)';
        await query(
            `INSERT INTO payments (subscription_id, vendor_id, amount, payment_method, transaction_id, status) VALUES (?, ?, 2999.00, ?, ?, 'PENDING')`,
            [subscription_id, vendor_id, payMethod, txnId]
        );

        // Dispatch vendor welcome email asynchronously
        const { sendAccountRegistrationEmail } = require('../../templates/accountRegistrationEmail');
        sendAccountRegistrationEmail('vendor', {
            store_name,
            owner_name: vendor_name,
            email,
            phone: phone_number,
            society_name: 'Omaxe Greenwood Residency',
            subscription_tier: 'Pro'
        });

        const newVendor = {
            vendor_id,
            account_holder_name,
            upi_id,
            qr_code_url,
            upi_qr_code: qr_code_url,
            qr_code: qr_code_url,
            whatsapp_number,
            accepted_payment_methods,
            payment_instructions,
            vendor_type,
            can_add_items,
            location_type,
            is_global_coverage,
            delivery_radius_km,
            selected_zones: Array.isArray(selected_zones) ? selected_zones : [],
            status: 'ACTIVE'
        };

        const tokens = generateTokens(newVendor);

        /* 
        // Cashfree Payment Gateway Session Creation (Commented out per user directive)
        const cfService = require('../../services/cashfreeService');
        const cfSession = await cfService.createVendorRegistrationPayment({
            vendor_id,
            store_name,
            vendor_name,
            email,
            phone_number
        }).catch(e => console.error('[Cashfree Session Error]:', e.message));
        */

        res.status(201).json({
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            vendor_id,
            vendor: newVendor
        });

        if (email) {
            const html = vendorWelcomeEmail(newVendor, password || 'VendorDefaultPass123!');
            sendEmail({
                to: email,
                subject: `Welcome to DigiLocal — Your store "${store_name}" is Live! 🎉`,
                html
            }).catch(e => console.error('[Register] Welcome email failed:', e.message));
        }
    } catch (err) {
        console.error('Error registering vendor:', err);
        res.status(500).json({ error: 'Failed to process vendor registration', details: err.message, stack: err.stack });
    }
}

/**
 * POST /api/vendors/login
 */
async function loginVendor(req, res) {
    try {
        const { email, password, phone, mobile, identifier, firebase_token, idToken, otp, code } = req.body;
        const fbToken = firebase_token || idToken;
        const loginOtp = otp || code;
        let targetIdentifier = String(email || phone || mobile || identifier || '').trim();

        let cleanPhone = normalizePhone(targetIdentifier);

        if (fbToken) {
            console.log('🏪 [VENDOR LOGIN] Authenticating via Firebase Phone Token...');
            const fbResult = await verifyFirebaseToken(fbToken);
            const rawPhone = fbResult.phone_number || '';
            cleanPhone = normalizePhone(rawPhone) || cleanPhone;
            targetIdentifier = cleanPhone || targetIdentifier;
            if (!targetIdentifier) {
                return res.status(400).json({ error: 'Firebase token does not contain a verified phone number' });
            }
        }

        cleanPhone = normalizePhone(targetIdentifier);
        const cleanEmail = targetIdentifier.toLowerCase();

        const vendorRes = await query(
            `SELECT * FROM vendors 
             WHERE (LOWER(email) = ? AND email != '') 
                OR (RIGHT(REGEXP_REPLACE(phone_number, '\\D', 'g', 'g'), 10) = ? AND phone_number != '')`,
            [cleanEmail, cleanPhone]
        );

        if (vendorRes.rows.length === 0) {
            recordFailedAttempt(targetIdentifier);
            return res.status(401).json({ error: 'Vendor store account not found for this mobile or email' });
        }

        const vendor = vendorRes.rows[0];

        if (password && !fbToken) {
            const passwordMatch = await comparePassword(password, vendor.password_hash || vendor.password);
            if (!passwordMatch.matches) {
                recordFailedAttempt(targetIdentifier);
                return res.status(401).json({ error: 'Invalid email/phone or password' });
            }
        } else if (!fbToken && loginOtp) {
            const otpRes = verifyOTP(targetIdentifier, loginOtp);
            if (!otpRes.valid) {
                recordFailedAttempt(targetIdentifier);
                return res.status(401).json({ error: otpRes.reason || 'Invalid OTP code' });
            }
        } else if (!fbToken) {
            recordFailedAttempt(targetIdentifier);
            return res.status(401).json({ error: 'Authentication requires a password or OTP.' });
        }

        resetFailedAttempts(targetIdentifier);

        const tokens = generateTokens(vendor);

        const vendorPayload = {
            vendor_id: Number(vendor.vendor_id),
            id: Number(vendor.vendor_id),
            public_id: vendor.public_id || String(vendor.vendor_id),
            store_name: vendor.store_name,
            vendor_name: vendor.vendor_name,
            email: vendor.email,
            phone_number: vendor.phone_number,
            society_id: Number(vendor.society_id),
            status: vendor.status || 'ACTIVE'
        };

        res.status(200).json({
            success: true,
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            vendor_id: Number(vendor.vendor_id),
            id: Number(vendor.vendor_id),
            store_name: vendor.store_name,
            vendor_name: vendor.vendor_name,
            email: vendor.email,
            phone_number: vendor.phone_number,
            society_id: Number(vendor.society_id),
            status: vendor.status || 'ACTIVE',
            vendor: vendorPayload,
            data: {
                token: tokens.accessToken,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                vendor: vendorPayload
            }
        });
    } catch (err) {
        console.error('Error during vendor login:', err);
        res.status(500).json({ error: 'Vendor login failed' });
    }
}

/**
 * POST /api/vendors/user-login or /api/vendors/login-as-user
 */
async function handleUserLogin(req, res) {
    try {
        const { email, password } = req.body;

        const vendorRes = await query(`SELECT * FROM vendors WHERE email = ?`, [email]);
        if (vendorRes.rows.length === 0) {
            recordFailedAttempt(email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const vendor = vendorRes.rows[0];

        const passwordMatch = await comparePassword(password, vendor.password);
        if (!passwordMatch.matches) {
            recordFailedAttempt(email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        resetFailedAttempts(email);

        delete vendor.password;
        const tokens = generateTokens({ ...vendor, role: 'user' }, 'user');

        res.status(200).json({
            message: 'User login successful (Vendor acting as User)',
            user: {
                id: vendor.vendor_id,
                vendor_id: vendor.vendor_id,
                name: vendor.vendor_name,
                email: vendor.email,
                phone_number: vendor.phone_number,
                role: 'user'
            },
            role: 'user',
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });
    } catch (err) {
        console.error('Error during user login:', err);
        res.status(500).json({ error: 'User login failed' });
    }
}

/**
 * POST /api/vendors/user-register
 */
async function handleUserRegisterCheck(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email address is required' });
        }

        const existingVendor = await query(`SELECT vendor_id FROM vendors WHERE email = ?`, [email]);
        if (existingVendor.rows.length > 0) {
            return res.status(400).json({
                error: 'An account with this email address already exists as a vendor. You do not need to sign up again—you can log in directly as a user using your existing vendor credentials.',
                alreadyRegisteredAsVendor: true
            });
        }

        res.status(200).json({ message: 'Email address available for user registration' });
    } catch (err) {
        console.error('Error verifying user registration email:', err);
        res.status(500).json({ error: 'Failed to verify email address' });
    }
}

/**
 * POST /api/vendors/refresh
 */
function refreshToken(req, res) {
    const { refreshToken: rToken } = req.body;
    if (!rToken) return res.status(400).json({ error: 'Refresh token is required' });

    const { verifyJwt, generateTokens: genT } = require('../../utils/auth');
    const authConfig = require('../../config/auth');

    const payload = verifyJwt(rToken, authConfig.jwt.refreshTokenSecret);
    if (!payload || payload.type !== 'refresh') {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const tokens = genT({ vendor_id: payload.id, id: payload.id });
    res.status(200).json({
        message: 'Access token refreshed successfully',
        accessToken: tokens.accessToken,
        token: tokens.accessToken
    });
}

/**
 * POST /api/vendors/logout
 */
function logoutVendor(req, res) {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : req.body?.refreshToken;
    if (token) revokeToken(token);
    res.status(200).json({ message: 'Logout successful, tokens revoked' });
}

/**
 * POST /api/vendors/forgot-password
 */
/**
 * POST /api/vendors/forgot-password
 */
async function forgotPassword(req, res) {
    try {
        const { email, phone, mobile, identifier } = req.body;
        const target = String(email || phone || mobile || identifier || '').trim();

        if (!target) {
            return res.status(400).json({ error: 'Email or mobile number is required' });
        }

        const cleanPhone = normalizePhone(target);
        const cleanEmail = target.toLowerCase();

        const vendorRes = await query(
            `SELECT vendor_id, vendor_name, email, phone_number FROM vendors 
             WHERE (LOWER(email) = ? AND email != '') 
                OR (RIGHT(REGEXP_REPLACE(phone_number, '\\D', 'g', 'g'), 10) = ? AND phone_number != '')`,
            [cleanEmail, cleanPhone]
        );

        if (vendorRes.rows.length === 0) {
            return res.status(200).json({ message: 'If an account exists with this mobile number or email, an OTP has been sent.' });
        }

        const vendor = vendorRes.rows[0];
        const otpId = vendor.email || vendor.phone_number || cleanEmail || cleanPhone;
        const otp = generateOTP(otpId);

        res.status(200).json({
            message: 'OTP sent successfully to registered address or phone number',
            simulationOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
        });
    } catch (err) {
        console.error('Error sending OTP:', err);
        res.status(500).json({ error: 'Failed to process forgot password request' });
    }
}

/**
 * POST /api/vendors/verify-otp
 */
async function verifyVendorOtp(req, res) {
    try {
        const { otp, code, email, phone, mobile, identifier, phone_number, mobile_number, country_code, countryCode } = req.body;
        const inputOtp = otp || code;
        const target = String(phone || mobile || phone_number || mobile_number || identifier || email || '').trim();

        if (!target || !inputOtp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP code are required for verification'
            });
        }

        const msg91Result = await verifyMsg91OTP(target, inputOtp, country_code || countryCode);
        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            data: msg91Result,
            valid: true
        });
    } catch (err) {
        console.error('❌ [MSG91 VENDOR VERIFY ERROR]:', err.message);
        res.status(400).json({
            success: false,
            message: err.message || 'Invalid or expired OTP'
        });
    }
}


/**
 * POST /api/vendors/reset-password
 */
async function resetPassword(req, res) {
    try {
        const { email, phone, mobile, identifier, otp, code, newPassword, new_password } = req.body;
        const pass = newPassword || new_password;
        const inputOtp = otp || code;
        const target = String(email || phone || mobile || identifier || '').trim();

        if (!target || !pass) {
            return res.status(400).json({ error: 'Email/phone and new password are required' });
        }

        const cleanPhone = normalizePhone(target);
        const cleanEmail = target.toLowerCase();

        const vendorRes = await query(
            `SELECT vendor_id, email, phone_number FROM vendors 
             WHERE (LOWER(email) = ? AND email != '') 
                OR (RIGHT(REGEXP_REPLACE(phone_number, '\\D', 'g', 'g'), 10) = ? AND phone_number != '')`,
            [cleanEmail, cleanPhone]
        );

        if (vendorRes.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor account not found' });
        }

        const vendor = vendorRes.rows[0];
        const otpId = vendor.email || vendor.phone_number || cleanEmail || cleanPhone;

        if (inputOtp) {
            const verifyResult = verifyOTP(otpId, inputOtp);
            if (!verifyResult.valid) {
                const altVerify = verifyOTP(target, inputOtp);
                if (!altVerify.valid) {
                    return res.status(400).json({ error: verifyResult.reason || altVerify.reason || 'Invalid OTP code' });
                }
            }
        }

        const newHash = await hashPassword(pass);
        await query(`UPDATE vendors SET password = ?, password_hash = ? WHERE vendor_id = ?`, [newHash, newHash, vendor.vendor_id]);

        resetFailedAttempts(target);
        if (vendor.email) resetFailedAttempts(vendor.email);

        res.status(200).json({ message: 'Password reset successfully! You can now log in with your new password.' });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
}

/*
Cashfree Payment Gateway Handlers (Commented out per user directive)
async function createCashfreeSession(req, res) { ... }
async function verifyCashfreePayment(req, res) { ... }
*/

/**
 * POST /api/vendors/check-coverage
 * [DEPRECATED / COMMENTED OUT PER USER DIRECTIVE]
 * Go Global map dynamic coverage selection is disabled in the new location workflow.
 */
async function checkCoverage(req, res) {
    return res.status(200).json({
        success: false,
        disabled: true,
        message: 'Go Global map dynamic radius selection has been commented out per the new location workflow. Vendors now register with Area, City, State, and Pincode.'
    });
}



async function getVendorStatus(req, res) {
    try {
        let vendorId = req.params.vendorId || req.params.id || req.user?.vendor_id || req.user?.id || req.query.vendorId || req.query.vendor_id;

        if (!vendorId && req.headers['authorization']) {
            try {
                const token = req.headers['authorization'].replace('Bearer ', '').trim();
                const { verifyJwt } = require('../../utils/auth');
                const authConfig = require('../../config/auth');
                const payload = verifyJwt(token, authConfig.jwt.secret);
                if (payload) {
                    vendorId = payload.vendor_id || payload.id;
                }
            } catch (_) { }
        }

        if (!vendorId) {
            return res.status(400).json({ error: 'Vendor ID or Authorization Bearer token is required to fetch status.' });
        }

        const result = await query(
            `SELECT vendor_id, store_name, vendor_name, area, city, status, hold_reason, hold_email_subject, has_resubmitted, resubmitted_at, created_at FROM vendors WHERE vendor_id = ? OR public_id = ? OR CAST(vendor_id AS TEXT) = ?`,
            [vendorId, String(vendorId), String(vendorId)]
        );

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ error: `Vendor ID "${vendorId}" not found.` });
        }

        const v = result.rows[0];
        const statusLower = (v.status || 'pending').toLowerCase();
        const isApproved = statusLower === 'active' || statusLower === 'approved' || statusLower === 'accepted';
        const isPending = statusLower === 'pending';
        const isRejected = statusLower === 'rejected';
        const isOnHold = statusLower === 'hold' || statusLower === 'on_hold';

        let currentStatus = 'pending';
        if (isApproved) currentStatus = 'accepted';
        else if (isRejected) currentStatus = 'rejected';
        else if (isOnHold) currentStatus = 'on_hold';

        let message = 'Your application request will be processed soon.';
        let recommended_ui_text = 'Your registration request is under review by admin. Verification will be completed soon.';

        if (isApproved) {
            message = 'Store is verified and active.';
            recommended_ui_text = 'Congratulations! Your shop application is approved and active.';
        } else if (isRejected) {
            message = 'Merchant application was rejected by admin.';
            recommended_ui_text = 'Your application was rejected. Please contact support for details.';
        } else if (isOnHold) {
            if (v.has_resubmitted) {
                message = 'Your updated details have been resubmitted and are currently under review.';
                recommended_ui_text = 'Your resubmitted application is currently under review by admin.';
            } else {
                message = 'Your application is currently on hold. Please update your details as requested in the email/reason and resubmit.';
                recommended_ui_text = 'Your request is on hold. Please edit your store settings and click Resubmit Request.';
            }
        }

        return res.status(200).json({
            vendor_id: Number(v.vendor_id),
            status: currentStatus,
            is_accepted: isApproved,
            is_pending: isPending,
            is_rejected: isRejected,
            is_on_hold: isOnHold,
            has_resubmitted: Boolean(v.has_resubmitted),
            resubmitted_at: v.resubmitted_at || null,
            hold_email_subject: v.hold_email_subject || '',
            hold_reason: v.hold_reason || '',
            message,
            recommended_ui_text
        });
    } catch (err) {
        console.error('Error fetching vendor status:', err);
        return res.status(500).json({ error: 'Failed to fetch vendor status.' });
    }
}

async function resubmitVendorRequest(req, res) {
    try {
        let vendorId = req.params.vendorId || req.params.id || req.user?.vendor_id || req.user?.id || req.body?.vendor_id;

        if (!vendorId && req.headers['authorization']) {
            try {
                const token = req.headers['authorization'].replace('Bearer ', '').trim();
                const { verifyJwt } = require('../../utils/auth');
                const authConfig = require('../../config/auth');
                const payload = verifyJwt(token, authConfig.jwt.secret);
                if (payload) vendorId = payload.vendor_id || payload.id;
            } catch (_) { }
        }

        if (!vendorId) {
            return res.status(400).json({ error: 'Vendor ID or Authorization Bearer token is required for resubmission.' });
        }

        const existing = await query(`SELECT * FROM vendors WHERE vendor_id = ?`, [vendorId]);
        if (!existing.rows || existing.rows.length === 0) {
            return res.status(404).json({ error: `Vendor ID "${vendorId}" not found.` });
        }

        const body = req.body || {};
        const store_name = body.store_name || body.shop_name;
        const vendor_name = body.vendor_name || body.owner_name;
        const phone_number = body.phone_number || body.phone;
        const gstin = body.gstin || body.gst_number || body.pan_number;
        const area = body.area || body.location;
        const city = body.city;
        const pincode = body.pincode;
        const shop_image = body.shop_image || body.logo || body.avatar_url;

        await query(`
      UPDATE vendors SET 
        store_name = COALESCE(?, store_name),
        vendor_name = COALESCE(?, vendor_name),
        phone_number = COALESCE(?, phone_number),
        gstin = COALESCE(?, gstin),
        area = COALESCE(?, area),
        city = COALESCE(?, city),
        pincode = COALESCE(?, pincode),
        logo = COALESCE(?, logo),
        shop_image = COALESCE(?, shop_image),
        status = 'HOLD',
        has_resubmitted = TRUE,
        resubmitted_at = CURRENT_TIMESTAMP
      WHERE vendor_id = ?
    `, [store_name, vendor_name, phone_number, gstin, area, city, pincode, shop_image, shop_image, vendorId]);

        return res.status(200).json({
            vendor_id: Number(vendorId),
            status: 'on_hold',
            has_resubmitted: true,
            resubmitted_at: new Date().toISOString(),
            message: 'Your application update has been resubmitted successfully. It is under review in the Hold section by the Admin team.'
        });
    } catch (err) {
        console.error('Error resubmitting vendor request:', err);
        return res.status(500).json({ error: 'Failed to resubmit vendor application.' });
    }
}


module.exports = {
    getVendorStatus,
    resubmitVendorRequest,
    getVendorPublicProfile,
    sendVendorOtp,
    checkVendorPhone,
    registerVendor,
    loginVendor,
    handleUserLogin,
    handleUserRegisterCheck,
    refreshToken,
    logoutVendor,
    forgotPassword,
    verifyVendorOtp,
    resetPassword,
    checkCoverage
};
