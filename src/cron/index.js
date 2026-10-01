const cron = require('node-cron');
const subscriptionService = require('../services/subscriptionService');

/**
 * Starts the automated subscription expiry cron job.
 * Runs daily at 9:00 AM (for daily milestone emails: 7 days, 3 days, 1 day, 0 days).
 * Also runs hourly to automatically transition expired subscriptions to 'EXPIRED' status
 * and hide their storefronts from the user portal.
 */
const startSubscriptionCron = () => {
    // 1. Daily morning run at 9:00 AM for milestone reminder emails (7d, 3d, 1d, 0d)
    cron.schedule('0 9 * * *', async () => {
        try {
            console.log('[Subscription Cron] Running daily 9:00 AM subscription expiry checks...');
            const report = await subscriptionService.checkAndSendReminders();
            console.log('[Subscription Cron] Check finished:', JSON.stringify(report));
        } catch (err) {
            console.error('[Subscription Cron] Error during 9:00 AM check:', err.message);
        }
    });

    // 2. Hourly check to detect and process subscriptions reaching expiration time
    cron.schedule('0 * * * *', async () => {
        try {
            const report = await subscriptionService.checkAndSendReminders();
            if (report.subscriptions_expired > 0 || report.reminders_sent_0d > 0) {
                console.log('[Subscription Cron Hourly] Processed expiries:', JSON.stringify(report));
            }
        } catch (err) {
            console.error('[Subscription Cron] Error during hourly expiry sweep:', err.message);
        }
    });

    console.log('[Subscription Cron] Scheduled: Daily at 9:00 AM & hourly expiration sweep.');
};

module.exports = { startSubscriptionCron };
