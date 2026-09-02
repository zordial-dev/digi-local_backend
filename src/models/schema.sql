-- DigiLocal Platform Relational Database Schema (PostgreSQL & SQLite compatible)

CREATE TABLE IF NOT EXISTS locations (
    location_id BIGSERIAL PRIMARY KEY,
    area VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS societies (
    society_id BIGSERIAL PRIMARY KEY,
    society_name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    location VARCHAR(255) DEFAULT '',
    latitude DECIMAL(10,7) DEFAULT 28.6270,
    longitude DECIMAL(10,7) DEFAULT 77.3720,
    secretary_name VARCHAR(255) DEFAULT 'Society Secretary',
    secretary_mobile VARCHAR(20) DEFAULT '9876543210',
    public_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sub_admins (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'sub_admin',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(120) DEFAULT 'Super Admin',
    creator_id VARCHAR(64) DEFAULT 'super-admin',
    created_role VARCHAR(50) DEFAULT 'super_admin',
    powers TEXT[] DEFAULT '{}',
    allowed_delegation_powers TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS sub_admin_powers (
    id SERIAL PRIMARY KEY,
    sub_admin_id VARCHAR(64) NOT NULL REFERENCES sub_admins(id) ON DELETE CASCADE,
    power_code VARCHAR(50) NOT NULL,
    UNIQUE(sub_admin_id, power_code)
);

CREATE TABLE IF NOT EXISTS sub_admin_allowed_delegation_powers (
    id SERIAL PRIMARY KEY,
    sub_admin_id VARCHAR(64) NOT NULL REFERENCES sub_admins(id) ON DELETE CASCADE,
    allowed_power_code VARCHAR(50) NOT NULL,
    UNIQUE(sub_admin_id, allowed_power_code)
);

CREATE TABLE IF NOT EXISTS backend_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    timestamp_readable VARCHAR(64) NOT NULL,
    user_email VARCHAR(160) NOT NULL,
    user_name VARCHAR(120) NOT NULL,
    user_role VARCHAR(32) NOT NULL,
    module VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    summary VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    entity_id VARCHAR(64),
    page_path VARCHAR(255) NOT NULL
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
    shop_number VARCHAR(100),
    shop_image TEXT,
    pan_number VARCHAR(50),
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
    category VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    area VARCHAR(255),
    location VARCHAR(255),
    location_address TEXT,
    latitude DECIMAL(10,7) DEFAULT 28.6270,
    longitude DECIMAL(10,7) DEFAULT 77.3720,
    location_type VARCHAR(50) DEFAULT 'society',
    is_global_coverage BOOLEAN DEFAULT FALSE,
    delivery_radius_km DECIMAL(5,2) DEFAULT 0.00,
    selected_zones JSONB DEFAULT '[]',
    vendor_type VARCHAR(20) DEFAULT 'product',
    can_add_items BOOLEAN DEFAULT TRUE,
    account_number VARCHAR(50),
    bank_account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    ifsc VARCHAR(20),
    bank_name VARCHAR(100),
    account_holder_name VARCHAR(255),
    upi_id VARCHAR(100),
    qr_code_url TEXT,
    upi_qr_code TEXT,
    qr_code TEXT,
    whatsapp_number VARCHAR(20),
    accepted_payment_methods VARCHAR(255) DEFAULT 'COD,UPI,BANK_TRANSFER,QR_CODE',
    payment_instructions TEXT,
    push_token TEXT,
    fcm_token TEXT,
    device_token TEXT,
    device_type VARCHAR(50) DEFAULT 'android',
    location_id BIGINT,
    platform VARCHAR(50) DEFAULT 'android',
    public_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'PENDING',
    hold_reason TEXT,
    hold_email_subject VARCHAR(255),
    has_resubmitted BOOLEAN DEFAULT FALSE,
    resubmitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
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
    vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
    society_id BIGINT,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    payment_method VARCHAR(50) DEFAULT 'COD',
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    delivery_address TEXT,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    order_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_details (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(100) REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id BIGINT REFERENCES items(item_id) ON DELETE SET NULL,
    item_name VARCHAR(255),
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS enquiries (
    enquiry_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    user_id VARCHAR(100),
    user_name VARCHAR(255),
    user_phone VARCHAR(20),
    society_id BIGINT,
    society_name VARCHAR(255),
    sector VARCHAR(100),
    service_type VARCHAR(100),
    preferred_time VARCHAR(100),
    description TEXT,
    issue_photos JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(32) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(64) NOT NULL,
    priority VARCHAR(32) NOT NULL DEFAULT 'medium',
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    user_type VARCHAR(32) NOT NULL DEFAULT 'user',
    source VARCHAR(64) DEFAULT 'landing_website',
    reporter_name VARCHAR(128) NOT NULL,
    reporter_email VARCHAR(128) NOT NULL,
    reporter_user_id VARCHAR(64),
    entity_name VARCHAR(128),
    target_vendor VARCHAR(128),
    order_id VARCHAR(64),
    order_amount DECIMAL(10, 2),
    assigned_to VARCHAR(128) DEFAULT 'Super Admin',
    sla_minutes_remaining INT DEFAULT 120,
    followers TEXT[] DEFAULT '{}',
    merged_into VARCHAR(64),
    merged_children TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at_ist TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at_readable VARCHAR(64),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id VARCHAR(64) PRIMARY KEY,
    ticket_id VARCHAR(64) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_name VARCHAR(128) NOT NULL,
    sender_role VARCHAR(32) NOT NULL,
    sender_avatar VARCHAR(255),
    message TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at_ist TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at_readable VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS ticket_attachments (
    id VARCHAR(64) PRIMARY KEY,
    ticket_id VARCHAR(64) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INT NOT NULL,
    file_url VARCHAR(512) NOT NULL,
    uploaded_by VARCHAR(128) NOT NULL,
    uploaded_at_ist TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_sla_config (
    id INT PRIMARY KEY DEFAULT 1,
    urgent_sla_minutes INT DEFAULT 15,
    high_sla_minutes INT DEFAULT 45,
    medium_sla_minutes INT DEFAULT 120,
    low_sla_minutes INT DEFAULT 240,
    auto_escalate_on_breach BOOLEAN DEFAULT TRUE,
    notify_assigned_staff BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tags (
    tag_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    color VARCHAR(32) NOT NULL DEFAULT '#10B981',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cms_pages (
    page_id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
