# DigiLocal Backend

Backend API service for the DigiLocal Vendor Ordering and Subscription Platform.

## Features
- **User & Resident APIs**: Authentication, OTP verification, profiles, address management, and ordering.
- **Vendor Panel APIs**: Registration, catalog/product management, order fulfillment, and notifications.
- **Admin Management**: Approvals, ticketing & support desk, user/vendor controls, and reporting.

## Setup & Running

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### Installation
```bash
npm install
```

### Environment Configuration
Create a `.env` file in the root directory with your database connection details and secret keys:
```env
PORT=5000
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret
```

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Tests
```bash
npm test
```
