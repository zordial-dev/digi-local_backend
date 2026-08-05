'use strict';

/**
 * Generates a premium HTML welcome email for newly registered vendors.
 * @param {Object} vendor - Vendor details
 * @param {string} vendor.vendor_name
 * @param {string} vendor.store_name
 * @param {string} vendor.email
 * @param {string} vendor.phone_number
 * @param {string} vendor.category
 * @param {string} vendor.address
 * @param {string} vendor.city
 * @param {string} vendor.shop_no
 * @param {number} vendor.vendor_id
 * @param {string} plainPassword - The raw password (before hashing) shown once in email
 */
function vendorWelcomeEmail(vendor, plainPassword) {
    const {
        vendor_name = 'Valued Partner',
        store_name = 'Your Store',
        email = '',
        phone_number = '',
        category = 'General',
        address = '',
        city = '',
        shop_no = '',
        vendor_id = ''
    } = vendor;

    const year = new Date().getFullYear();
    const registeredDate = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const dashboardUrl = process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/vendor/dashboard`
        : 'http://localhost:3000/vendor/dashboard';

    const maskedPassword = plainPassword
        ? plainPassword.slice(0, 2) + '*'.repeat(Math.max(plainPassword.length - 4, 2)) + plainPassword.slice(-2)
        : '(as set during registration)';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to DigiLocal — ${store_name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f0f4f8; font-family: 'Inter', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  </style>
</head>
<body style="background-color:#f0f4f8; padding:24px 0;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px; margin:0 auto;">
    <tr><td>

      <!-- ── HEADER ─────────────────────────────────────── -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0A1428 0%, #1a2f5e 60%, #0d2144 100%); border-radius:16px 16px 0 0; overflow:hidden;">
        <tr>
          <td style="padding:40px 40px 0 40px;">
            <!-- Logo / Brand Row -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display:inline-block; background:rgba(197,168,128,0.15); border:1px solid rgba(197,168,128,0.3); border-radius:10px; padding:8px 18px;">
                    <span style="font-size:22px; font-weight:800; color:#C5A880; letter-spacing:1px;">Digi<span style="color:#ffffff;">Local</span></span>
                  </div>
                </td>
                <td align="right">
                  <span style="font-size:11px; color:rgba(255,255,255,0.45); letter-spacing:2px; text-transform:uppercase;">Vendor Platform</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 40px 40px; text-align:center;">
            <!-- Hero Icon -->
            <div style="width:80px; height:80px; background:linear-gradient(135deg, #C5A880, #e8c99a); border-radius:20px; margin:0 auto 20px; display:flex; align-items:center; justify-content:center; font-size:36px; line-height:80px;">
              🏪
            </div>
            <h1 style="font-size:28px; font-weight:800; color:#ffffff; margin-bottom:10px; line-height:1.2;">
              Welcome Aboard, ${vendor_name}!
            </h1>
            <p style="font-size:15px; color:rgba(255,255,255,0.65); line-height:1.6; max-width:420px; margin:0 auto;">
              Your vendor account for <strong style="color:#C5A880;">${store_name}</strong> has been created successfully on the DigiLocal Platform.
            </p>
            <!-- Success Badge -->
            <div style="margin-top:24px; display:inline-block; background:rgba(72,199,142,0.15); border:1px solid rgba(72,199,142,0.4); border-radius:50px; padding:8px 22px;">
              <span style="font-size:13px; color:#48c78e; font-weight:600;">✓ Registration Successful</span>
            </div>
          </td>
        </tr>
        <!-- Bottom Curve -->
        <tr>
          <td style="background:#f0f4f8; height:20px; border-radius:16px 16px 0 0;"></td>
        </tr>
      </table>

      <!-- ── BODY ───────────────────────────────────────── -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff; padding:0 8px;">
        <tr><td style="padding:32px 32px 0 32px;">

          <!-- Greeting -->
          <p style="font-size:15px; color:#374151; line-height:1.8;">
            Hi <strong>${vendor_name}</strong>,<br/>
            Congratulations on joining the <strong>DigiLocal</strong> family! Your store is now live and ready to serve residents in your society. Below are your account credentials and store details — please keep them safe.
          </p>

          <!-- ── Account Credentials Card ── -->
          <div style="background:linear-gradient(135deg, #f8faff, #eef2ff); border:1px solid #dde4ff; border-radius:12px; padding:24px; margin:28px 0 0 0;">
            <h2 style="font-size:14px; font-weight:700; color:#4f46e5; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:16px;">
              🔐 &nbsp;Your Login Credentials
            </h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0; border-bottom:1px solid #e0e7ff;">
                  <span style="font-size:12px; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Login Email</span><br/>
                  <span style="font-size:15px; color:#111827; font-weight:600;">${email || 'Not provided'}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;">
                  <span style="font-size:12px; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Password</span><br/>
                  <span style="font-size:15px; color:#111827; font-weight:600; font-family:monospace; background:#f3f4f6; padding:3px 10px; border-radius:6px;">${maskedPassword}</span>
                  <span style="font-size:11px; color:#9ca3af; margin-left:8px;">(use your registered password)</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- ── Store Details Card ── -->
          <div style="background:#fffbf5; border:1px solid #fde8c0; border-radius:12px; padding:24px; margin:16px 0 0 0;">
            <h2 style="font-size:14px; font-weight:700; color:#d97706; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:16px;">
              🏷️ &nbsp;Store Details
            </h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${_row('Store Name', store_name)}
              ${_row('Owner Name', vendor_name)}
              ${_row('Phone Number', phone_number || 'Not provided')}
              ${_row('Business Category', category)}
              ${_row('Address', [address, city].filter(Boolean).join(', ') || 'Not provided')}
              ${_row('Vendor ID', `#${vendor_id}`, true)}
              ${_row('Registered On', registeredDate)}
            </table>
          </div>

          <!-- ── Subscription Info ── -->
          <div style="background:linear-gradient(135deg, #f0fdf4, #dcfce7); border:1px solid #86efac; border-radius:12px; padding:20px 24px; margin:16px 0 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:40px; vertical-align:top; padding-top:2px;">
                  <span style="font-size:22px;">🎉</span>
                </td>
                <td>
                  <p style="font-size:14px; font-weight:700; color:#15803d; margin-bottom:4px;">1-Year Subscription Activated!</p>
                  <p style="font-size:13px; color:#166534; line-height:1.6;">Your premium vendor subscription is now active. You can manage your inventory, track orders, and update your store settings anytime from your dashboard.</p>
                </td>
              </tr>
            </table>
          </div>

          <!-- ── CTA Button ── -->
          <div style="text-align:center; margin:32px 0 24px 0;">
            <a href="${dashboardUrl}"
               style="display:inline-block; background:linear-gradient(135deg, #0A1428, #1a2f5e); color:#C5A880; text-decoration:none; padding:14px 40px; border-radius:10px; font-size:15px; font-weight:700; letter-spacing:0.5px;">
              Go to Vendor Dashboard →
            </a>
          </div>

          <!-- ── Tips ── -->
          <div style="border-left:3px solid #C5A880; padding-left:16px; margin:0 0 28px 0;">
            <p style="font-size:13px; font-weight:700; color:#374151; margin-bottom:8px;">Quick Start Tips:</p>
            <ul style="font-size:13px; color:#6b7280; line-height:2; padding-left:18px;">
              <li>Add your product catalog from the <strong>Items</strong> section</li>
              <li>Set your store timings and delivery preferences</li>
              <li>Share your store link with residents in your society</li>
              <li>Track incoming orders in real-time from the Orders tab</li>
            </ul>
          </div>

        </td></tr>
      </table>

      <!-- ── FOOTER ─────────────────────────────────────── -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b; border-radius:0 0 16px 16px; overflow:hidden;">
        <tr>
          <td style="padding:28px 32px; text-align:center;">
            <p style="font-size:13px; color:rgba(255,255,255,0.5); line-height:1.8; margin-bottom:12px;">
              This email was sent to <strong style="color:rgba(255,255,255,0.7);">${email}</strong> because you registered as a vendor on DigiLocal.<br/>
              If this wasn't you, please contact support immediately.
            </p>
            <p style="font-size:11px; color:rgba(255,255,255,0.3);">
              © ${year} DigiLocal Platform. All rights reserved.<br/>
              Need help? Reply to this email or contact our support team.
            </p>
          </td>
        </tr>
      </table>

    </td></tr>
  </table>

</body>
</html>`;
}

function _row(label, value, highlight = false) {
    return `<tr>
        <td style="padding:7px 0; border-bottom:1px solid rgba(0,0,0,0.05);">
          <span style="font-size:12px; color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">${label}</span><br/>
          <span style="font-size:14px; color:${highlight ? '#4f46e5' : '#111827'}; font-weight:${highlight ? '700' : '500'};">${value}</span>
        </td>
      </tr>`;
}

module.exports = { vendorWelcomeEmail };
