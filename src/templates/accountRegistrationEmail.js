'use strict';
const { sendEmail } = require('../services/emailService');

/**
 * Dedicated Account Registration Email Templates for DigiLocal Platform.
 * Provides responsive, production-ready HTML email layouts for both 
 * Resident User registration and Vendor Merchant store creation.
 */

const BRAND_NAVY = '#0A1428';
const BRAND_GOLD = '#C5A880';
const BRAND_BG = '#FAF9F6';
const BRAND_BORDER = '#E0D5C3';

/**
 * Base Responsive Container Layout for Registration Emails
 */
function buildBaseLayout(headerTitle, contentHtml) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle}</title>
</head>
<body style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${BRAND_BG}; padding: 40px 15px; color: #0A1428; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid ${BRAND_BORDER}; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.08);">
    
    <!-- Brand Header -->
    <div style="background-color: ${BRAND_NAVY}; padding: 32px 36px; text-align: center;">
      <h1 style="color: ${BRAND_GOLD}; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 3px; font-family: sans-serif;">DIGILOCAL</h1>
      <p style="color: #8AA0B8; font-size: 12px; margin: 6px 0 0; letter-spacing: 2px; text-transform: uppercase;">Hyperlocal Society Marketplace</p>
    </div>
    
    <!-- Body Area -->
    <div style="padding: 40px 36px;">
      <h2 style="color: ${BRAND_NAVY}; font-size: 22px; font-weight: 700; margin: 0 0 18px; line-height: 1.3;">${headerTitle}</h2>
      ${contentHtml}
      
      <hr style="border: none; border-top: 1px solid #F0E8DD; margin: 32px 0;" />
      
      <div style="text-align: center; font-size: 12px; color: #8AA0B8; line-height: 1.6;">
        <p style="margin: 0 0 4px;">This email confirms your official registration on the DigiLocal platform.</p>
        <p style="margin: 0;">Questions or assistance? Contact our support team at <a href="mailto:support@digilocal.in" style="color: ${BRAND_GOLD}; font-weight: 600; text-decoration: none;">support@digilocal.in</a></p>
      </div>
    </div>
    
    <!-- Footer Bar -->
    <div style="background-color: #F4EFE6; padding: 16px; text-align: center; font-size: 11px; color: #7A8B9E;">
      &copy; 2026 DigiLocal Technologies India Pvt Ltd. All rights reserved.
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * 1. User Account Registration Email Template
 * @param {Object} user
 * @param {string} user.name - Full name of the resident user
 * @param {string} user.email - User email address
 * @param {string} user.phone - Registered phone number
 * @param {string} user.society_name - Name of the society
 * @param {string} user.flat - Tower/Flat details
 */
function generateUserRegistrationEmail({ name, email, phone, society_name, flat }) {
  const residentName = name || 'Resident';
  const society = society_name || 'Neighborhood Society';
  const flatDetails = flat || 'Registered Enclave';
  const mobileNum = phone || 'Registered Mobile';

  const bodyHtml = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
      Hello <strong>${residentName}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
      Welcome to <strong>DigiLocal</strong>! Your resident account has been registered successfully. You can now shop directly from verified local stores within <strong>${society}</strong> with fast doorstep delivery.
    </p>

    <!-- Registration Details Card -->
    <div style="background-color: ${BRAND_BG}; border-left: 4px solid ${BRAND_GOLD}; border-radius: 8px; border: 1px solid ${BRAND_BORDER}; padding: 22px 24px; margin-bottom: 28px;">
      <h3 style="margin: 0 0 14px; font-size: 15px; color: ${BRAND_NAVY}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Account Summary</h3>
      
      <table style="width: 100%; font-size: 14px; color: #334155; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; width: 140px; color: #64748B;">Registered Name:</td>
          <td style="padding: 6px 0; font-weight: 600; color: ${BRAND_NAVY};">${residentName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748B;">Mobile Number:</td>
          <td style="padding: 6px 0; color: ${BRAND_NAVY};">${mobileNum}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748B;">Residential Society:</td>
          <td style="padding: 6px 0; color: ${BRAND_NAVY};">${society}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748B;">Flat / Residence:</td>
          <td style="padding: 6px 0; color: ${BRAND_NAVY};">${flatDetails}</td>
        </tr>
      </table>
    </div>

    <!-- Feature Highlights -->
    <h4 style="margin: 0 0 12px; font-size: 14px; color: ${BRAND_NAVY};">What you can do with your DigiLocal Account:</h4>
    <ul style="margin: 0 0 28px; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.8;">
      <li>Order groceries, essentials, and everyday items from verified local society vendors.</li>
      <li>Enjoy express doorstep delivery within minutes.</li>
      <li>Track order progress in real-time from placement to fulfillment.</li>
    </ul>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0 12px;">
      <a href="http://localhost:5173" style="background-color: ${BRAND_NAVY}; color: ${BRAND_GOLD}; font-weight: 700; padding: 15px 36px; border-radius: 10px; text-decoration: none; font-size: 14px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(10,20,40,0.25);">
        EXPLORE NEIGHBORHOOD MARKETPLACE
      </a>
    </div>
  `;

  return {
    subject: `🎉 Welcome to DigiLocal! Registration Confirmed for ${society}`,
    html: buildBaseLayout('🎉 Your Account Registration is Complete', bodyHtml)
  };
}

/**
 * 2. Vendor Store Account Registration Email Template
 * @param {Object} vendor
 * @param {string} vendor.store_name - Name of the merchant store
 * @param {string} vendor.owner_name - Full name of the store owner/manager
 * @param {string} vendor.email - Merchant email address
 * @param {string} vendor.phone - Registered business phone number
 * @param {string} vendor.society_name - Target society where store is located
 * @param {string} vendor.subscription_tier - Subscription tier (pro, enterprise)
 */
function generateVendorRegistrationEmail({ store_name, owner_name, email, phone, society_name, subscription_tier }) {
  const store = store_name || 'Local Merchant Store';
  const owner = owner_name || 'Store Merchant';
  const society = society_name || 'Society Enclave';
  const phoneNum = phone || 'Business Contact';
  const tier = (subscription_tier || 'Pro Tier').toUpperCase();

  const bodyHtml = `
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
      Dear <strong>${owner}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
      Congratulations! Your merchant store <strong>"${store}"</strong> has been successfully registered on the <strong>DigiLocal Platform</strong> for <strong>${society}</strong>.
    </p>

    <!-- Merchant Registration Box -->
    <div style="background-color: ${BRAND_BG}; border-left: 4px solid ${BRAND_GOLD}; border-radius: 8px; border: 1px solid ${BRAND_BORDER}; padding: 22px 24px; margin-bottom: 28px;">
      <h3 style="margin: 0 0 14px; font-size: 15px; color: ${BRAND_NAVY}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Merchant Store Details</h3>
      
      <table style="width: 100%; font-size: 14px; color: #334155; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; width: 140px; color: #64748B;">Store Name:</td>
          <td style="padding: 6px 0; font-weight: 700; color: ${BRAND_NAVY};">${store}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748B;">Store Owner:</td>
          <td style="padding: 6px 0; color: ${BRAND_NAVY};">${owner}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748B;">Business Contact:</td>
          <td style="padding: 6px 0; color: ${BRAND_NAVY};">${phoneNum}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748B;">Target Society:</td>
          <td style="padding: 6px 0; color: ${BRAND_NAVY};">${society}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #64748B;">Subscription Plan:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #059669;">${tier}</td>
        </tr>
      </table>
    </div>

    <!-- Onboarding Checklist -->
    <h4 style="margin: 0 0 12px; font-size: 14px; color: ${BRAND_NAVY};">Next Steps to Start Selling:</h4>
    <ol style="margin: 0 0 28px; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.8;">
      <li>Log in to your Vendor Partner Portal.</li>
      <li>Upload your store logo and set business operating hours.</li>
      <li>Add products and catalog items with prices.</li>
      <li>Start receiving orders directly from society residents!</li>
    </ol>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0 12px;">
      <a href="http://localhost:5174/vendor" style="background-color: ${BRAND_NAVY}; color: ${BRAND_GOLD}; font-weight: 700; padding: 15px 36px; border-radius: 10px; text-decoration: none; font-size: 14px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(10,20,40,0.25);">
        OPEN VENDOR DASHBOARD
      </a>
    </div>
  `;

  return {
    subject: `🏪 Store Registration Confirmed: ${store} is now on DigiLocal`,
    html: buildBaseLayout('🏪 Vendor Merchant Registration Confirmed', bodyHtml)
  };
}

/**
 * Dispatch Account Registration Welcome Email (Non-blocking)
 * @param {'user' | 'vendor'} accountType 
 * @param {Object} data 
 */
async function sendAccountRegistrationEmail(accountType, data) {
  try {
    const targetEmail = data.email;
    if (!targetEmail || !targetEmail.includes('@') || targetEmail.endsWith('.internal')) {
      console.log(`[Registration Email] Skipped email dispatch for non-standard address: ${targetEmail}`);
      return;
    }

    let emailPayload;
    if (accountType === 'vendor') {
      emailPayload = generateVendorRegistrationEmail(data);
    } else {
      emailPayload = generateUserRegistrationEmail(data);
    }

    // Send email asynchronously
    sendEmail({
      to: targetEmail,
      subject: emailPayload.subject,
      html: emailPayload.html
    }).catch(err => {
      console.warn(`[Registration Email Warning] Failed to send ${accountType} welcome email:`, err.message);
    });
  } catch (err) {
    console.error(`[Registration Email Error] Unexpected error preparing ${accountType} email:`, err.message);
  }
}

module.exports = {
  generateUserRegistrationEmail,
  generateVendorRegistrationEmail,
  sendAccountRegistrationEmail
};
