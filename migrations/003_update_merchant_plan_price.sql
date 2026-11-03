-- Migration 003: Update Merchant Subscription Plan to ₹1 with neutral name
-- Preserves all historical payment records, subscriptions, and upgrade audit logs.

UPDATE plans 
SET price = 1.00,
    name = 'Monthly Merchant Plan',
    description = '1 Month InPinch Storefront Visibility & Resident Ordering',
    features = '["Storefront visible on InPinch user portal", "Customers can view and buy products", "Vendor panel dashboard access", "Real-time order notifications", "Priority merchant support"]'::jsonb
WHERE plan_code = 'MONTHLY_TEST_2' OR (is_active = TRUE AND price = 2.00);

