'use strict';
const nodemailer = require('nodemailer');

/**
 * Creates and returns a configured Nodemailer transporter.
 * Seamlessly supports AWS SES SMTP credentials as well as standard SMTP / Gmail.
 */
function createTransporter(portOverride = null) {
    const user = (process.env.AWS_SMTP_USERNAME || process.env.SMTP_USER || '').trim();
    const pass = (process.env.AWS_SMTP_PASSWORD || process.env.SMTP_PASS || '').trim();
    let host = (process.env.SMTP_HOST || '').trim();
    const port = portOverride || parseInt(process.env.SMTP_PORT || '2587', 10);

    if (user && (!host || host === 'smtp.gmail.com') && process.env.AWS_SMTP_USERNAME) {
        host = process.env.AWS_REGION
            ? `email-smtp.${process.env.AWS_REGION}.amazonaws.com`
            : 'email-smtp.us-east-1.amazonaws.com';
    }

    if (!host || !user || !pass) {
        console.warn('[EmailService] SMTP credentials not configured in .env — emails will be skipped.');
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,   // true for 465 (SSL), false for 2587 / 587 (TLS/STARTTLS)
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 7000
    });
}

/**
 * Sends an email using the configured SMTP transporter (AWS SES or standard SMTP).
 */
async function sendEmail({ to, subject, html }) {
    const candidatePorts = [parseInt(process.env.SMTP_PORT || '2587', 10)]; // must be array — for...of on a bare number iterates digits

    const user = (process.env.AWS_SMTP_USERNAME || process.env.SMTP_USER || '').trim();
    const pass = (process.env.AWS_SMTP_PASSWORD || process.env.SMTP_PASS || '').trim();
    let host = (process.env.SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com').trim();
    const rawFrom = process.env.AWS_SES_FROM || process.env.SMTP_FROM || `"DigiLocal Platform" <${user}>`;
    const from = rawFrom.trim();

    let lastError = null;

    for (const port of candidatePorts) {
        try {
            const transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
                tls: { rejectUnauthorized: false },
                connectionTimeout: 5000,
                greetingTimeout: 5000,
                socketTimeout: 7000
            });

            const info = await transporter.sendMail({ from, to, subject, html });
            console.log(`[EmailService] Email delivered to ${to} via port ${port} | MessageId: ${info.messageId}`);
            return { sent: true, messageId: info.messageId };
        } catch (err) {
            lastError = err;
            console.warn(`[EmailService] Port ${port} attempt failed (${err.message}). Trying next port...`);
        }
    }

    return { sent: false, reason: lastError?.message || 'SMTP delivery failed on all ports' };
}

/**
 * Sends a Login Security Alert email to a User or Vendor when they log in.
 * Executed non-blocking (fire-and-forget).
 */
async function sendLoginAlertEmail({ to, name, role = 'user', store_name = null, loginMethod = 'Password', ipAddress = null, userAgent = null }) {
    if (!to || !to.includes('@') || to.endsWith('.internal')) {
        return { sent: false, reason: 'No valid recipient email address' };
    }

    try {
        const { loginAlertTemplate } = require('../templates/emailTemplates');
        const istTime = new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short'
        }) + ' IST';

        const portalDesc = role === 'vendor' ? 'Vendor Portal' : 'User Portal';
        const subject = `🔐 Security Alert: Login to your DigiLocal ${portalDesc}`;
        const html = loginAlertTemplate({
            name,
            role,
            store_name,
            loginMethod,
            loginTime: istTime,
            ipAddress,
            userAgent
        });

        return await sendEmail({ to, subject, html });
    } catch (err) {
        console.warn(`[Login Alert Email Error] Failed to send login email to ${to}:`, err.message);
        return { sent: false, reason: err.message };
    }
}


/**
 * Sends a Service Enquiry Alert email to a merchant when a resident submits an enquiry.
 * Non-blocking, fault-tolerant: returns { sent: boolean, reason/messageId } without throwing.
 */
async function sendEnquiryAlertEmail({ to, merchant_name, store_name, enquiry = {} }) {
    if (!to || typeof to !== 'string' || !to.includes('@') || to.endsWith('.internal')) {
        console.warn(`[Enquiry Alert Email] Skipped: No valid recipient email address (${to})`);
        return { sent: false, reason: 'No valid recipient email address' };
    }

    try {
        const { serviceEnquiryTemplate } = require('../templates/emailTemplates');
        const { formatISTReadable } = require('../utils/time');

        const enqId = enquiry.enquiry_id || enquiry.id || 'N/A';
        const serviceType = enquiry.service_type || 'General Service';
        const subject = `🔔 New Service Request #${enqId}: ${serviceType} [${store_name || merchant_name || 'DigiLocal'}]`;
        const istTime = formatISTReadable(enquiry.created_at || new Date());

        const html = serviceEnquiryTemplate({
            merchant_name,
            store_name,
            enquiry_id: enqId,
            customer_name: enquiry.user_name || enquiry.name,
            customer_phone: enquiry.user_phone || enquiry.phone,
            service_type: serviceType,
            preferred_time: enquiry.preferred_time,
            description: enquiry.description,
            society_name: enquiry.society_name,
            sector: enquiry.sector,
            created_at: istTime
        });

        const res = await sendEmail({ to, subject, html });
        return res;
    } catch (err) {
        console.warn(`[Enquiry Alert Email Error] Failed to send email to ${to}:`, err.message);
        return { sent: false, reason: err.message };
    }
}

module.exports = { sendEmail, sendLoginAlertEmail, sendEnquiryAlertEmail };
