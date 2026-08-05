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

module.exports = { sendEmail };
