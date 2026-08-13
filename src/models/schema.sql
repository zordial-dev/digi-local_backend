-- DigiLocal Platform Relational Database Schema (PostgreSQL & SQLite compatible)

CREATE TABLE IF NOT EXISTS societies (
    society_id BIGSERIAL PRIMARY KEY,
    society_name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    location VARCHAR(255) DEFAULT '',
    secretary_name VARCHAR(255) DEFAULT 'Society Secretary',
    secretary_mobile VARCHAR(20) DEFAULT '9876543210',
    public_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sub_admins (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'SUB_ADMIN',
    assigned_society_id BIGINT,
    powers TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_config (
    id INT PRIMARY KEY DEFAULT 1,
    platform_name VARCHAR(255) DEFAULT 'DigiLocal',
    platform_logo TEXT DEFAULT 'https://imgh.in/host/ucila6',
    admin_password_hash VARCHAR(255),
    gst_percentage DECIMAL(5,2) DEFAULT 18.00,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    currency VARCHAR(10) DEFAULT 'INR',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    person_type VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    society_id BIGINT REFERENCES societies(society_id) ON DELETE SET NULL,
    society_name VARCHAR(255),
    store_name VARCHAR(255),
    flat VARCHAR(100),
    flags_count INT DEFAULT 0,
    joined_date VARCHAR(50),
    avatar TEXT,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
    vendor_id BIGSERIAL PRIMARY KEY,
    society_id BIGINT REFERENCES societies(society_id) ON DELETE CASCADE,
    society_name VARCHAR(255),
    vendor_name VARCHAR(255) NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    gstin VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    gst_number VARCHAR(50),
    opening_time VARCHAR(20) DEFAULT '08:00 AM',
    closing_time VARCHAR(20) DEFAULT '10:00 PM',
    opening_timing VARCHAR(20) DEFAULT '08:00 AM',
    closing_timing VARCHAR(20) DEFAULT '10:00 PM',
    min_order_value DECIMAL(10,2) DEFAULT 0.00,
    max_quantity_limit INT DEFAULT 10,
    delivery_charge DECIMAL(10,2) DEFAULT 0.00,
    gst_percentage DECIMAL(5,2) DEFAULT 5.00,
    service_charge_percentage DECIMAL(5,2) DEFAULT 0.00,
    subscription_tier VARCHAR(50) DEFAULT 'pro',
    renewal_date TIMESTAMP DEFAULT '2026-12-31 00:00:00',
    total_orders INT DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    logo TEXT DEFAULT 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80',
    avatar_url TEXT,
    description TEXT DEFAULT 'Quality goods & daily essentials delivered within society via WhatsApp.',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    public_id VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    item_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 100,
    category VARCHAR(100) DEFAULT 'General',
    unit VARCHAR(20) DEFAULT 'piece',
    is_available BOOLEAN DEFAULT TRUE,
    in_stock BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catalog_items (
    item_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    image_url TEXT,
    in_stock BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    order_id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100),
    vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    society_id BIGINT REFERENCES societies(society_id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    delivery_address TEXT NOT NULL,
    customer_id BIGINT,
    customer_name VARCHAR(255),
    order_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_details (
    order_id VARCHAR(100) NOT NULL,
    item_id BIGINT,
    item_name VARCHAR(255),
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2),
    item_total DECIMAL(10,2),
    PRIMARY KEY (order_id, item_name)
);

CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    plan_tier VARCHAR(50) DEFAULT 'pro',
    billing_cycle VARCHAR(50) DEFAULT 'annual',
    amount DECIMAL(10,2) DEFAULT 2999.00,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id BIGSERIAL PRIMARY KEY,
    subscription_id BIGINT,
    vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    store_name VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Razorpay (UPI)',
    transaction_id VARCHAR(100) UNIQUE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'SUCCESS',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promotions (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    target_type VARCHAR(50) DEFAULT 'CATEGORY',
    target_value VARCHAR(255),
    placement VARCHAR(50) DEFAULT 'HERO_SLIDER',
    display_order INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(100) PRIMARY KEY,
    ticket_number VARCHAR(50),
    user_id VARCHAR(100),
    user_name VARCHAR(255),
    email VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General Query',
    status VARCHAR(50) DEFAULT 'OPEN',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_messages (
    id VARCHAR(100) PRIMARY KEY,
    ticket_id VARCHAR(100) REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) DEFAULT 'USER',
    sender_name VARCHAR(255),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'SYSTEM',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100),
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT NOT NULL
);

