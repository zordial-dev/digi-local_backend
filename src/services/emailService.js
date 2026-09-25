'use strict';
const nodemailer = require('nodemailer');

/**
 * Creates and returns a configured Nodemailer transporter.
 * Seamlessly supports AWS SES SMTP credentials as well as standard SMTP / Gmail.
 */
function createTransporter() {
    const user = (process.env.AWS_SMTP_USERNAME || process.env.SMTP_USER || '').trim();
    const pass = (process.env.AWS_SMTP_PASSWORD || process.env.SMTP_PASS || '').trim();
    let host = (process.env.SMTP_HOST || '').trim();
    const port = parseInt(process.env.SMTP_PORT || '587', 10);

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
        secure: port === 465,   // true for 465 (SSL), false for 587 (TLS)
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
    });
}

/**
 * Sends an email using the configured SMTP transporter (AWS SES or standard SMTP).
 */
async function sendEmail({ to, subject, html }) {
    const transporter = createTransporter();
    if (!transporter) return { sent: false, reason: 'SMTP credentials not configured in .env' };

    try {
        const rawFrom = process.env.AWS_SES_FROM || process.env.SMTP_FROM || `"DigiLocal Platform" <${process.env.AWS_SMTP_USERNAME || process.env.SMTP_USER}>`;
        const from = rawFrom.trim();

        const info = await transporter.sendMail({ from, to, subject, html });
        console.log(`[EmailService] Email sent to ${to} | MessageId: ${info.messageId}`);
        return { sent: true, messageId: info.messageId };
    } catch (err) {
        console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
        return { sent: false, reason: err.message };
    }
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

module.exports = { sendEmail, sendLoginAlertEmail };
