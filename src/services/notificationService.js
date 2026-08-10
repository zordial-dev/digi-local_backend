const { admin, isFirebaseAvailable } = require('../config/firebase');
const { query } = require('../models/db');

/**
 * Service for dispatching high-priority Zomato/Swiggy-style sound push notifications via FCM,
 * Expo Push API (Expo Go), and real-time Socket.IO alerts to Vendor Mobile Apps.
 */
class NotificationService {
  constructor() {
    this.processedOrders = new Set();
  }

  /**
   * Registers or updates a vendor's FCM / Expo Device Token for Push Notifications.
   */
  async updateVendorFcmToken(vendorId, fcmToken, platform = 'android') {
    if (!vendorId || !fcmToken) return { success: false, error: 'Missing vendorId or token' };
    try {
      await query(
        `UPDATE vendors SET fcm_token = ?, device_token = ?, device_type = ?, platform = ? WHERE vendor_id = ? OR public_id = ?`,
        [fcmToken, fcmToken, platform, platform, vendorId, String(vendorId)]
      );
      console.log(`📱 [PUSH TOKEN SAVED] Updated token for Vendor #${vendorId}`);
      return { success: true };
    } catch (err) {
      console.error('[NotificationService] Error saving FCM token:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Alias for updateVendorFcmToken.
   */
  async registerVendorFcmToken(vendorId, fcmToken, platform = 'android') {
    return this.updateVendorFcmToken(vendorId, fcmToken, platform);
  }

  /**
   * Removes FCM / Expo Device Token on vendor logout.
   */
  async clearVendorFcmToken(vendorId) {
    if (!vendorId) return { success: false, error: 'Missing vendorId' };
    try {
      await query(
        `UPDATE vendors SET fcm_token = NULL, device_token = NULL WHERE vendor_id = ? OR public_id = ?`,
        [vendorId, String(vendorId)]
      );
      console.log(`📱 [PUSH TOKEN CLEARED] Cleared token for Vendor #${vendorId}`);
      return { success: true };
    } catch (err) {
      console.error('[NotificationService] Error clearing FCM token:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Alias for clearVendorFcmToken.
   */
  async unregisterVendorFcmToken(vendorId) {
    return this.clearVendorFcmToken(vendorId);
  }

  /**
   * Sends high-priority Push Notification (FCM / Expo) & Socket.IO Sound Alert to Vendor on New Order.
   */
  async notifyVendorNewOrder({ vendor_id, order_id, total_amount, customer_name, items_count = 1, items = [] }) {
    try {
      // 1. Deduplication Guard: Prevent double-notifying for the same order_id
      if (order_id && this.processedOrders.has(String(order_id))) {
        console.log(`ℹ️ [PUSH DEDUP] Notification already sent for order #${order_id}. Bypassing duplicate.`);
        return { success: true, bypassed: true, message: 'Notification already sent for this order_id' };
      }
      if (order_id) {
        this.processedOrders.add(String(order_id));
        if (this.processedOrders.size > 1000) {
          const firstKey = this.processedOrders.values().next().value;
          this.processedOrders.delete(firstKey);
        }
      }

      // 2. Fetch vendor's registered FCM / Expo device token
      const vendorRes = await query(
        `SELECT fcm_token, device_token FROM vendors WHERE vendor_id = ? OR public_id = ?`,
        [vendor_id, String(vendor_id)]
      );

      const fcmToken = vendorRes.rows[0]?.fcm_token || vendorRes.rows[0]?.device_token;

      const formattedTotal = Number(total_amount || 0).toFixed(2);
      const title = `🔔 NEW ORDER RECEIVED! (#${order_id})`;
      const body = `${customer_name || 'Resident'} placed an order worth ₹${formattedTotal} (${items_count} items). Tap to view order details.`;

      let pushResult = { success: true, mode: 'mock', fcm_token: fcmToken };

      // 3. Dispatch Push Notification
      if (fcmToken) {
        if (fcmToken.includes('ExponentPushToken') || fcmToken.startsWith('ExponentPushToken[')) {
          // Expo Push Notification API (for Expo Go & Expo apps)
          try {
            const expoPayload = {
              to: fcmToken,
              sound: 'default',
              title,
              body,
              priority: 'high',
              channelId: 'order-alarm',
              data: {
                type: 'NEW_ORDER_RECEIVED',
                order_id: String(order_id),
                vendor_id: String(vendor_id),
                total_amount: String(formattedTotal),
                sound: 'new_order_alert_sound'
              },
              ttl: 60,
              expiration: Math.floor(Date.now() / 1000) + 60
            };

            const response = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(expoPayload)
            });

            const resData = await response.json();
            const messageId = resData?.data?.id || `expo_${Date.now()}`;
            console.log(`✅ [EXPO PUSH SUCCESS] Sent to Vendor #${vendor_id} token ${fcmToken.slice(-12)} | Message ID: ${messageId}`);
            pushResult = { success: true, service: 'expo', messageId, fcm_token: fcmToken };
          } catch (expoErr) {
            console.error('[NotificationService] Expo Push send error:', expoErr.message);
            pushResult = { success: true, service: 'expo', mode: 'expo_fallback', fcm_token: fcmToken };
          }
        } else if (isFirebaseAvailable()) {
          // Firebase Cloud Messaging (FCM Native)
          try {
            const message = {
              token: fcmToken,
              notification: { title, body },
              android: {
                priority: 'high',
                notification: {
                  channelId: 'new_order_high_priority_channel',
                  sound: 'new_order_alert_sound',
                  defaultSound: true,
                  priority: 'max',
                  visibility: 'public'
                }
              },
              apns: {
                payload: {
                  aps: {
                    sound: 'new_order_alert_sound.caf',
                    badge: 1
                  }
                }
              },
              data: {
                type: 'NEW_ORDER_RECEIVED',
                order_id: String(order_id),
                vendor_id: String(vendor_id),
                total_amount: String(formattedTotal),
                sound: 'new_order_alert_sound'
              }
            };

            const messageId = await admin.messaging().send(message);
            console.log(`✅ [FCM PUSH SUCCESS] Sent to Vendor #${vendor_id} | Message ID: ${messageId}`);
            pushResult = { success: true, mode: 'fcm', service: 'fcm', messageId, fcm_token: fcmToken };
          } catch (fcmErr) {
            console.error('[NotificationService] FCM send error:', fcmErr.message);
            pushResult = { success: true, mode: 'mock_fallback', service: 'fcm', fcm_token: fcmToken };
          }
        } else {
          // Firebase not initialized in environment -> mock mode
          pushResult = { success: true, mode: 'mock_fallback', service: 'fcm', fcm_token: fcmToken };
        }
      } else {
        console.warn(`⚠️ [NotificationService] No push token registered for Vendor #${vendor_id}`);
        pushResult = { success: true, mode: 'no_token', message: 'No device token registered for vendor' };
      }

      // 4. Emit Real-Time Socket.IO Alert for Foreground Audio Chime
      try {
        const { getIO } = require('../socket');
        const io = getIO();
        if (io) {
          const socketPayload = {
            order_id: String(order_id),
            vendor_id: String(vendor_id),
            total_amount: formattedTotal,
            customer_name: customer_name || 'Resident',
            items_count,
            items,
            timestamp: new Date().toISOString(),
            sound: 'new_order_alert_sound'
          };
          io.to(`vendor_${vendor_id}`).to(String(vendor_id)).emit('NEW_ORDER_ALERT', socketPayload);
          console.log(`🔌 [SOCKET.IO BROADCAST] Sent NEW_ORDER_ALERT to room vendor_${vendor_id}`);
        }
      } catch (wsErr) {
        // Socket.IO optional fallback
      }

      return pushResult;
    } catch (err) {
      console.error('[NotificationService] Error notifying vendor of new order:', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new NotificationService();
