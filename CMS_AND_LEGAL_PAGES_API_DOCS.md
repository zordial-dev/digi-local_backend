# 📘 DigiLocal CMS, Legal Pages & Support Contacts REST API Specification
**Production Ready Documentation for Frontend Engineers**  
**Version**: 1.0.0 | **Last Updated**: August 14, 2026  
**Database Persistence**: PostgreSQL (`cms_pages`, `support_contacts`)

---

## 🌐 Base URL Infrastructure
- **Local Development Gateway**: `http://localhost:5001/api` (or `http://172.25.12.195:5001/api`)
- **Staging / Cloud Gateway**: `https://digi-local-backend.onrender.com/api`mn

---

## 📞 Default Contact Details Reference
These contact details are stored dynamically in PostgreSQL (`support_contacts`) and served across all legal and support endpoints:
- **Customer Helpline Phone**: `+91 800-562-5999`
- **Official Support Email**: `support@digilocal.in`
- **Toll-Free Support**: `1800-123-4567`
- **WhatsApp Support**: `+91 80056 25999`
- **Working Hours**: `Monday to Saturday | 9:00 AM - 8:00 PM IST`
- **Corporate Address**: `DigiLocal Tech Hub, Tower B, Sector 62, Noida, UP - 201309`

---

## 🚀 Quick Reference: Direct Convenience Endpoints

| Method | Endpoint Route | Description |
|---|---|---|
| `GET` | `/api/help-support` | Fetch Help & Support page content + contact details |
| `GET` | `/api/about-us` | Fetch About Us platform overview content |
| `GET` | `/api/privacy-policy` | Fetch complete Privacy Policy legal document |
| `GET` | `/api/terms-conditions` | Fetch complete Terms & Conditions legal document |
| `GET` | `/api/cms/contacts` | Fetch support phone, email, WhatsApp, address & working hours |
| `GET` | `/api/support/contact-info` | Alias for support contacts info |
| `GET` | `/api/cms/pages` | List all available CMS & legal page slugs and metadata |
| `GET` | `/api/cms/pages/:slug` | Fetch any CMS page by slug (`help-support`, `about-us`, `privacy-policy`, `terms-conditions`) |
| `PUT` | `/api/cms/pages/:slug` | Update CMS page title, content, or metadata (Admin) |
| `PUT` | `/api/cms/contacts` | Update support phone, email, address, working hours in DB (Admin) |

---

## 📋 Detailed Endpoint Specifications

### 1. Fetch Support Contact Details
Returns current customer helpline phone number, email address, toll-free number, WhatsApp support number, working hours, and head office address.

- **HTTP Method**: `GET`
- **Route**: `/api/cms/contacts` (or `/api/support/contact-info`)
- **Authentication**: Public

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "phone": "+91 800-562-5999",
    "email": "support@digilocal.in",
    "toll_free": "1800-123-4567",
    "whatsapp": "+91 80056 25999",
    "address": "DigiLocal Tech Hub, Tower B, Sector 62, Noida, UP - 201309",
    "working_hours": "Monday to Saturday: 9:00 AM - 8:00 PM IST",
    "updated_at": "2026-08-14T10:30:00.000Z"
  }
}
```

---

### 2. Fetch Help & Support Page
Returns complete Help & Support guide, FAQ sections, and embedded contact details.

- **HTTP Method**: `GET`
- **Route**: `/api/help-support` (or `/api/cms/pages/help-support`)
- **Authentication**: Public

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "slug": "help-support",
    "title": "Help & Support Center",
    "meta_description": "Official DigiLocal Help & Support, FAQ, Order Assistance, and Customer Service Contacts.",
    "content": "# DigiLocal Help & Support Center\n\nWelcome to the DigiLocal Help & Support Center...\n\n## 📞 Quick Contact Information\n- **Support Hotline**: +91 800-562-5999\n- **Official Email**: support@digilocal.in...",
    "phone": "+91 800-562-5999",
    "email": "support@digilocal.in",
    "contact": {
      "phone": "+91 800-562-5999",
      "email": "support@digilocal.in",
      "toll_free": "1800-123-4567",
      "whatsapp": "+91 80056 25999",
      "address": "DigiLocal Tech Hub, Tower B, Sector 62, Noida, UP - 201309",
      "working_hours": "Monday to Saturday: 9:00 AM - 8:00 PM IST"
    },
    "updated_at": "2026-08-14T10:30:00.000Z"
  }
}
```

---

### 3. Fetch About Us Page
Returns the DigiLocal brand story, mission, and company overview.

- **HTTP Method**: `GET`
- **Route**: `/api/about-us` (or `/api/cms/pages/about-us`)
- **Authentication**: Public

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "slug": "about-us",
    "title": "About DigiLocal",
    "meta_description": "Learn about DigiLocal, India premier hyperlocal enclave e-commerce and residential merchant ecosystem.",
    "content": "# About DigiLocal\n\nDigiLocal is India's leading Hyperlocal Enclave E-Commerce Platform...",
    "phone": "+91 800-562-5999",
    "email": "support@digilocal.in",
    "updated_at": "2026-08-14T10:30:00.000Z"
  }
}
```

---

### 4. Fetch Privacy Policy Document
Returns complete data privacy policy document.

- **HTTP Method**: `GET`
- **Route**: `/api/privacy-policy` (or `/api/cms/pages/privacy-policy`)
- **Authentication**: Public

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "slug": "privacy-policy",
    "title": "Privacy Policy",
    "meta_description": "DigiLocal Privacy Policy detailing data protection, encryption, user consent, and security standards.",
    "content": "# DigiLocal Privacy Policy\n\n**Effective Date**: August 14, 2026...",
    "phone": "+91 800-562-5999",
    "email": "support@digilocal.in",
    "updated_at": "2026-08-14T10:30:00.000Z"
  }
}
```

---

### 5. Fetch Terms & Conditions Document
Returns legal terms of service document for resident users and merchants.

- **HTTP Method**: `GET`
- **Route**: `/api/terms-conditions` (or `/api/cms/pages/terms-conditions`)
- **Authentication**: Public

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "slug": "terms-conditions",
    "title": "Terms & Conditions",
    "meta_description": "DigiLocal Terms & Conditions of Service for residents, customers, and vendor merchants.",
    "content": "# DigiLocal Terms & Conditions\n\n**Effective Date**: August 14, 2026...",
    "phone": "+91 800-562-5999",
    "email": "support@digilocal.in",
    "updated_at": "2026-08-14T10:30:00.000Z"
  }
}
```

---

### 6. List All Available CMS Pages
Returns array of all available page slugs and metadata.

- **HTTP Method**: `GET`
- **Route**: `/api/cms/pages`
- **Authentication**: Public

#### Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "slug": "help-support",
      "title": "Help & Support Center",
      "meta_description": "Official DigiLocal Help & Support, FAQ, Order Assistance, and Customer Service Contacts.",
      "updated_at": "2026-08-14T10:30:00.000Z"
    },
    {
      "slug": "about-us",
      "title": "About DigiLocal",
      "meta_description": "Learn about DigiLocal, India premier hyperlocal enclave e-commerce and residential merchant ecosystem.",
      "updated_at": "2026-08-14T10:30:00.000Z"
    },
    {
      "slug": "privacy-policy",
      "title": "Privacy Policy",
      "meta_description": "DigiLocal Privacy Policy detailing data protection, encryption, user consent, and security standards.",
      "updated_at": "2026-08-14T10:30:00.000Z"
    },
    {
      "slug": "terms-conditions",
      "title": "Terms & Conditions",
      "meta_description": "DigiLocal Terms & Conditions of Service for residents, customers, and vendor merchants.",
      "updated_at": "2026-08-14T10:30:00.000Z"
    }
  ]
}
```

---

### 7. Update CMS Page Content (Admin)
Allows Super Admins or Sub-Admins with `SETTINGS` power to update title, markdown content, or meta description in PostgreSQL.

- **HTTP Method**: `PUT`
- **Route**: `/api/cms/pages/:slug` (or `/api/admin/cms/pages/:slug`)
- **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`
- **Request Body**:
```json
{
  "title": "Help & Support Center",
  "content": "# Updated Help & Support Guide\n\nFor assistance call +91 800-562-5999.",
  "meta_description": "Updated help & support guide."
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "CMS Page [help-support] updated successfully in database.",
  "data": {
    "slug": "help-support",
    "title": "Help & Support Center",
    "content": "# Updated Help & Support Guide\n\nFor assistance call +91 800-562-5999.",
    "meta_description": "Updated help & support guide."
  }
}
```

---

### 8. Update Support Contact Info (Admin)
Allows updating contact phone, email, toll-free number, WhatsApp number, working hours, and address in PostgreSQL.

- **HTTP Method**: `PUT`
- **Route**: `/api/cms/contacts` (or `/api/admin/cms/contacts`)
- **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`
- **Request Body**:
```json
{
  "phone": "+91 800-562-5999",
  "email": "support@digilocal.in",
  "toll_free": "1800-123-4567",
  "whatsapp": "+91 80056 25999",
  "address": "DigiLocal Tech Hub, Tower B, Sector 62, Noida, UP - 201309",
  "working_hours": "Monday to Saturday: 9:00 AM - 8:00 PM IST"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Support contact information updated successfully in database.",
  "data": {
    "phone": "+91 800-562-5999",
    "email": "support@digilocal.in",
    "toll_free": "1800-123-4567",
    "whatsapp": "+91 80056 25999",
    "address": "DigiLocal Tech Hub, Tower B, Sector 62, Noida, UP - 201309",
    "working_hours": "Monday to Saturday: 9:00 AM - 8:00 PM IST"
  }
}
```

---

## 💻 Frontend Code Examples (TypeScript & Axios / Fetch)

### Axios Example:
```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

export interface CmsPageData {
  slug: string;
  title: string;
  content: string;
  meta_description?: string;
  phone: string;
  email: string;
  contact?: {
    phone: string;
    email: string;
    toll_free: string;
    whatsapp: string;
    address: string;
    working_hours: string;
  };
}

export const fetchHelpSupport = async (): Promise<CmsPageData> => {
  const response = await axios.get(`${API_BASE_URL}/help-support`);
  return response.data.data;
};

export const fetchAboutUs = async (): Promise<CmsPageData> => {
  const response = await axios.get(`${API_BASE_URL}/about-us`);
  return response.data.data;
};

export const fetchPrivacyPolicy = async (): Promise<CmsPageData> => {
  const response = await axios.get(`${API_BASE_URL}/privacy-policy`);
  return response.data.data;
};

export const fetchTermsConditions = async (): Promise<CmsPageData> => {
  const response = await axios.get(`${API_BASE_URL}/terms-conditions`);
  return response.data.data;
};
```

---

### Native Fetch Example:
```javascript
// Fetch Help & Support
fetch('http://localhost:5001/api/help-support')
  .then(res => res.json())
  .then(res => {
    console.log('Help & Support Title:', res.data.title);
    console.log('Help Phone:', res.data.phone); // "+91 800-562-5999"
    console.log('Help Email:', res.data.email); // "support@digilocal.in"
    console.log('Markdown Content:', res.data.content);
  });
```
