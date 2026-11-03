-- Migration 001: Merchant Subscriptions and Cashfree Integration
-- Safe, idempotent, non-destructive schema migration.

-- 1. Extend plans table with explicit billing interval and sorting order
ALTER TABLE plans ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20) DEFAULT 'MONTHLY';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- 2. Seed single active ₹2/month testing plan idempotently (preserves any existing custom price edits)
INSERT INTO plans (
    plan_code, name, description, price, duration_days, 
    billing_cycle, billing_interval, features, is_active, sort_order
)
SELECT
    'MONTHLY_TEST_2',
    'Monthly Merchant Plan (Testing)',
    '1 Month InPinch Storefront Visibility & Resident Ordering (Testing Plan)',
    2.00,
    30,
    'MONTHLY',
    'MONTHLY',
    '["Storefront visible on InPinch user portal", "Customers can view and buy products", "Vendor panel dashboard access", "Real-time order notifications", "Priority merchant support"]'::jsonb,
    TRUE,
    1
WHERE NOT EXISTS (
    SELECT 1 FROM plans WHERE plan_code = 'MONTHLY_TEST_2'
);

-- Ensure MONTHLY_TEST_2 is active if already present
UPDATE plans SET is_active = TRUE WHERE plan_code = 'MONTHLY_TEST_2' AND is_active IS NOT TRUE;

-- 3. Deactivate legacy annual plan from active listings for new merchants (preserves existing vendor records & subscriptions intact)
UPDATE plans SET is_active = FALSE WHERE plan_code = 'ANNUAL_5999' AND is_active = TRUE;

-- 4. Extend subscriptions table for Cashfree order tracking and lifecycle
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20) DEFAULT 'MONTHLY';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cashfree_order_id VARCHAR(100);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cashfree_payment_id VARCHAR(100);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_cf_order ON subscriptions (cashfree_order_id);

-- 5. Create subscription_upgrades table with ON DELETE SET NULL to preserve audit trail
CREATE TABLE IF NOT EXISTS subscription_upgrades (
    upgrade_id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT REFERENCES vendors(vendor_id) ON DELETE SET NULL,
    subscription_id BIGINT REFERENCES subscriptions(subscription_id) ON DELETE SET NULL,
    from_plan_id BIGINT REFERENCES plans(plan_id) ON DELETE SET NULL,
    to_plan_id BIGINT REFERENCES plans(plan_id) ON DELETE SET NULL,
    old_plan_price DECIMAL(10,2) NOT NULL,
    new_plan_price DECIMAL(10,2) NOT NULL,
    unused_credit_amount DECIMAL(10,2) NOT NULL,
    payable_amount DECIMAL(10,2) NOT NULL,
    cashfree_order_id VARCHAR(100) UNIQUE,
    cashfree_payment_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_upgrades_vendor ON subscription_upgrades (vendor_id);
CREATE INDEX IF NOT EXISTS idx_sub_upgrades_cf_order ON subscription_upgrades (cashfree_order_id);

