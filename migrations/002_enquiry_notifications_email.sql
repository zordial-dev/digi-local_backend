-- Migration: 002_enquiry_notifications_email.sql
-- Description: Add vendor notification and email delivery tracking columns to enquiries table

ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS vendor_notified BOOLEAN DEFAULT FALSE;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS vendor_notified_at TIMESTAMP;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_enquiries_vendor_id ON enquiries(vendor_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);

