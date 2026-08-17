const { query } = require('../../models/db');

// Helper to sanitize slug formatting
function normalizeSlug(rawSlug) {
  if (!rawSlug) return 'help-support';
  return rawSlug.trim().toLowerCase().replace(/_/g, '-');
}

// Fallback content in case DB table is empty or loading
const FALLBACK_CONTACTS = {
  phone: '+91 800-562-5999',
  email: 'support@digilocal.in',
  toll_free: '1800-123-4567',
  whatsapp: '+91 80056 25999',
  address: 'DigiLocal Tech Hub, Tower B, Sector 62, Noida, UP - 201309',
  working_hours: 'Monday to Saturday: 9:00 AM - 8:00 PM IST'
};

const FALLBACK_PAGES = {
  'help-support': {
    slug: 'help-support',
    title: 'Help & Support Center',
    meta_description: 'Official DigiLocal Help & Support, FAQ, Order Assistance, and Customer Service Contacts.',
    content: `# DigiLocal Help & Support Center

Welcome to the DigiLocal Help & Support Center. We are committed to providing seamless assistance to resident customers, society secretaries, and local vendor merchants.

---

## 📞 Quick Contact Information
- **Support Hotline**: +91 800-562-5999
- **Official Email**: support@digilocal.in
- **Toll-Free Support**: 1800-123-4567
- **WhatsApp Support**: +91 80056 25999
- **Working Hours**: Monday - Saturday | 9:00 AM - 8:00 PM IST
- **Head Office**: DigiLocal Tech Hub, Tower B, Sector 62, Noida, UP - 201309

---

## 📋 Frequently Asked Questions (FAQ)

### 1. How do I place an order on DigiLocal?
You can browse verified vendor stores inside your registered residential society, select items into your cart, and checkout using Razorpay UPI, Cards, NetBanking, or Cash on Delivery.

### 2. What should I do if my order is delayed?
You can track live delivery status on your app dashboard or contact your society delivery rider directly using the phone number listed on your order invoice. For escalation, reach our support team at **+91 800-562-5999**.

### 3. How do refunds work for cancelled orders?
Refunds for prepaid orders are processed immediately upon order cancellation and are credited back to your original payment source within **3-5 business days** via Razorpay.

### 4. How can a store owner register as a Vendor?
Local merchants can apply by filling out the Merchant Registration form in the Vendor App or Admin Portal. Once verified by the Society Admin or Super Admin, your store will go live.

### 5. Need Urgent Help?
Email us directly at **support@digilocal.in** with your Order ID or Ticket Number for priority assistance.`
  },

  'about-us': {
    slug: 'about-us',
    title: 'About DigiLocal',
    meta_description: 'Learn about DigiLocal, India premier hyperlocal enclave e-commerce and residential merchant ecosystem.',
    content: `# About DigiLocal

DigiLocal is India's leading **Hyperlocal Enclave E-Commerce Platform**, empowering residential enclave societies, gated communities, and local neighborhood merchants.

---

## 🚀 Our Mission
Our mission is to bridge the gap between residential society families and trusted local store owners. By digitizing neighborhood stores, we deliver fresh groceries, daily essentials, artisan goods, and doorstep services with lightning-fast local delivery.

---

## 🌟 Why DigiLocal?
- **Verified Society Stores**: All vendor merchants are vetted and approved for your gated enclave.
- **Zero Delivery Delays**: Local neighborhood delivery within minutes directly to your flat.
- **Direct Merchant Connect**: Chat or call store owners directly for custom requests.
- **Secure Payments**: Powered by bank-grade Razorpay payment security and transparent order tracking.

---

## 🏢 Contact & Corporate Info
- **Corporate Email**: support@digilocal.in
- **Customer Helpline**: +91 800-562-5999
- **Corporate Address**: DigiLocal Tech Hub, Sector 62, Noida, UP - 201309`
  },

  'privacy-policy': {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    meta_description: 'DigiLocal Privacy Policy detailing data protection, encryption, user consent, and security standards.',
    content: `# DigiLocal Privacy Policy

**Effective Date**: August 14, 2026 | **Version**: 3.2.0

DigiLocal ("we", "our", or "us") respects your privacy and is dedicated to protecting your personal data. This Privacy Policy governs your use of the DigiLocal mobile applications, website, and admin platforms.

---

## 1. Information We Collect
- **Account Data**: Name, email address, mobile phone number, residential society name, and flat/tower details.
- **Transaction Data**: Order history, payment reference IDs, delivery addresses, and invoice summaries.
- **Technical Data**: Device IP address, app operating system, and secure session tokens.

---

## 2. How We Use Your Data
- To process and fulfill your daily local orders.
- To communicate order updates, delivery notifications, and support responses.
- To verify society residency and prevent fraudulent account creation.

---

## 3. Data Protection & Security
We enforce **256-bit SSL/TLS encryption** across all API traffic. Payment card and UPI details are securely handled by PCI-DSS compliant payment gateways (Razorpay). We **never** sell your personal information to third parties.

---

## 4. User Rights & Account Deletion
You reserve the right to request permanent deletion of your DigiLocal account and personal data at any time via App Settings or by emailing **support@digilocal.in**.

---

## 5. Contact Privacy Officer
For any privacy inquiries or data access requests, please contact our Data Protection Officer at:
- **Email**: support@digilocal.in
- **Phone**: +91 800-562-5999`
  },

  'terms-conditions': {
    slug: 'terms-conditions',
    title: 'Terms & Conditions',
    meta_description: 'DigiLocal Terms & Conditions of Service for residents, customers, and vendor merchants.',
    content: `# DigiLocal Terms & Conditions

**Effective Date**: August 14, 2026 | **Version**: 3.2.0

Please read these Terms & Conditions carefully before using the DigiLocal platform, mobile apps, or vendor services.

---

## 1. Acceptance of Terms
By creating an account on DigiLocal as a Resident User, Society Admin, or Vendor Merchant, you agree to comply with and be bound by these Terms & Conditions.

---

## 2. Resident Customer Terms
- Account details provided during registration must be accurate and reflect your true society residency.
- Payments must be completed through official platform channels (Razorpay UPI/Cards/COD).

---

## 3. Vendor Merchant Terms
- Merchants must maintain accurate product pricing, stock availability, and GST compliance.
- Orders must be fulfilled promptly in accordance with society delivery standards.

---

## 4. Cancellations & Dispute Resolution
- Orders cancelled prior to merchant dispatch qualify for a 100% instant refund.
- Any quality disputes regarding goods should be raised within **2 hours of delivery** through our Support Desk or by calling **+91 800-562-5999**.

---

## 5. Contact Information
For any legal inquiries regarding these terms:
- **Email**: support@digilocal.in
- **Phone**: +91 800-562-5999`
  }
};

/**
  Fetch Support Contact Information (Phone, Email, Hours, Address)
 */
async function getSupportContacts(req, res) {
  try {
    const dbRes = await query(`SELECT * FROM support_contacts WHERE id = 1`);
    if (dbRes.rows && dbRes.rows.length > 0) {
      const row = dbRes.rows[0];
      return res.status(200).json({
        success: true,
        data: {
          phone: row.phone || FALLBACK_CONTACTS.phone,
          email: row.email || FALLBACK_CONTACTS.email,
          toll_free: row.toll_free || FALLBACK_CONTACTS.toll_free,
          whatsapp: row.whatsapp || FALLBACK_CONTACTS.whatsapp,
          address: row.address || FALLBACK_CONTACTS.address,
          working_hours: row.working_hours || FALLBACK_CONTACTS.working_hours,
          updated_at: row.updated_at
        }
      });
    }
  } catch (err) {
    console.error('Error fetching support contacts from DB:', err.message);
  }

  return res.status(200).json({
    success: true,
    data: FALLBACK_CONTACTS
  });
}

/**
  Update Support Contact Information in Database
 */
async function updateSupportContacts(req, res) {
  try {
    const { phone, email, toll_free, whatsapp, address, working_hours } = req.body || {};
    
    await query(`
      INSERT INTO support_contacts (id, phone, email, toll_free, whatsapp, address, working_hours, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, NOW())
      ON CONFLICT (id) DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, support_contacts.phone),
        email = COALESCE(EXCLUDED.email, support_contacts.email),
        toll_free = COALESCE(EXCLUDED.toll_free, support_contacts.toll_free),
        whatsapp = COALESCE(EXCLUDED.whatsapp, support_contacts.whatsapp),
        address = COALESCE(EXCLUDED.address, support_contacts.address),
        working_hours = COALESCE(EXCLUDED.working_hours, support_contacts.working_hours),
        updated_at = NOW()
    `, [
      phone || FALLBACK_CONTACTS.phone,
      email || FALLBACK_CONTACTS.email,
      toll_free || FALLBACK_CONTACTS.toll_free,
      whatsapp || FALLBACK_CONTACTS.whatsapp,
      address || FALLBACK_CONTACTS.address,
      working_hours || FALLBACK_CONTACTS.working_hours
    ]);

    return res.status(200).json({
      success: true,
      message: 'Support contact information updated successfully in database.',
      data: { phone, email, toll_free, whatsapp, address, working_hours }
    });
  } catch (err) {
    console.error('Error updating support contacts:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update support contact information in database.' });
  }
}

/**
  Fetch all CMS Legal & Info Pages
 */
async function getCmsPages(req, res) {
  try {
    const dbRes = await query(`SELECT slug, title, meta_description, updated_at FROM cms_pages ORDER BY id ASC`);
    if (dbRes.rows && dbRes.rows.length > 0) {
      return res.status(200).json({
        success: true,
        data: dbRes.rows
      });
    }
  } catch (err) {
    console.error('Error fetching CMS pages list:', err.message);
  }

  const pagesList = Object.values(FALLBACK_PAGES).map(p => ({
    slug: p.slug,
    title: p.title,
    meta_description: p.meta_description,
    updated_at: new Date().toISOString()
  }));

  return res.status(200).json({
    success: true,
    data: pagesList
  });
}

/**
  Fetch specific CMS page by slug (e.g. help-support, about-us, privacy-policy, terms-conditions)
 */
async function getCmsPageBySlug(req, res) {
  const normSlug = normalizeSlug(req.params.slug || req.query.slug || 'help-support');

  let contactInfo = FALLBACK_CONTACTS;
  try {
    const cRes = await query(`SELECT * FROM support_contacts WHERE id = 1`);
    if (cRes.rows && cRes.rows.length > 0) {
      contactInfo = {
        phone: cRes.rows[0].phone || FALLBACK_CONTACTS.phone,
        email: cRes.rows[0].email || FALLBACK_CONTACTS.email,
        toll_free: cRes.rows[0].toll_free || FALLBACK_CONTACTS.toll_free,
        whatsapp: cRes.rows[0].whatsapp || FALLBACK_CONTACTS.whatsapp,
        address: cRes.rows[0].address || FALLBACK_CONTACTS.address,
        working_hours: cRes.rows[0].working_hours || FALLBACK_CONTACTS.working_hours
      };
    }
  } catch (_) {}

  try {
    const dbRes = await query(`SELECT * FROM cms_pages WHERE LOWER(slug) = ? OR LOWER(slug) = ?`, [normSlug, normSlug.replace(/-/g, '_')]);
    if (dbRes.rows && dbRes.rows.length > 0) {
      const page = dbRes.rows[0];
      return res.status(200).json({
        success: true,
        data: {
          slug: page.slug,
          title: page.title,
          content: page.content,
          meta_description: page.meta_description,
          contact: contactInfo,
          phone: contactInfo.phone,
          email: contactInfo.email,
          updated_at: page.updated_at
        }
      });
    }
  } catch (err) {
    console.error(`Error fetching CMS page [${normSlug}]:`, err.message);
  }

  const fallback = FALLBACK_PAGES[normSlug] || FALLBACK_PAGES['help-support'];
  return res.status(200).json({
    success: true,
    data: {
      ...fallback,
      contact: contactInfo,
      phone: contactInfo.phone,
      email: contactInfo.email,
      updated_at: new Date().toISOString()
    }
  });
}

/**
  Update specific CMS page content in Database by slug
 */
async function updateCmsPageBySlug(req, res) {
  const normSlug = normalizeSlug(req.params.slug || req.body.slug || 'help-support');
  const { title, content, meta_description } = req.body || {};

  if (!content) {
    return res.status(400).json({ success: false, error: 'Content field is required.' });
  }

  try {
    const defaultTitle = title || (FALLBACK_PAGES[normSlug]?.title || normSlug.replace(/-/g, ' ').toUpperCase());

    await query(`
      INSERT INTO cms_pages (slug, title, content, meta_description, updated_at)
      VALUES (?, ?, ?, ?, NOW())
      ON CONFLICT (slug) DO UPDATE SET
        title = COALESCE(EXCLUDED.title, cms_pages.title),
        content = EXCLUDED.content,
        meta_description = COALESCE(EXCLUDED.meta_description, cms_pages.meta_description),
        updated_at = NOW()
    `, [normSlug, defaultTitle, content, meta_description || '']);

    return res.status(200).json({
      success: true,
      message: `CMS Page [${normSlug}] updated successfully in database.`,
      data: { slug: normSlug, title: defaultTitle, content, meta_description }
    });
  } catch (err) {
    console.error(`Error updating CMS page [${normSlug}]:`, err.message);
    return res.status(500).json({ success: false, error: `Failed to update CMS page [${normSlug}] in database.` });
  }
}

module.exports = {
  getSupportContacts,
  updateSupportContacts,
  getCmsPages,
  getCmsPageBySlug,
  updateCmsPageBySlug,
  // Convenience alias handlers
  getHelpSupport: (req, res) => { req.params.slug = 'help-support'; return getCmsPageBySlug(req, res); },
  getAboutUs: (req, res) => { req.params.slug = 'about-us'; return getCmsPageBySlug(req, res); },
  getPrivacyPolicy: (req, res) => { req.params.slug = 'privacy-policy'; return getCmsPageBySlug(req, res); },
  getTermsConditions: (req, res) => { req.params.slug = 'terms-conditions'; return getCmsPageBySlug(req, res); },
};
