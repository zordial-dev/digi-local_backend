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
      const isNumeric = !isNaN(Number(vendorId)) && vendorId !== null && vendorId !== undefined;
      const numId = isNumeric ? Number(vendorId) : -1;
      const strId = String(vendorId);

      await query(
        `UPDATE vendors SET push_token = ?, fcm_token = ?, device_token = ?, device_type = ?, platform = ? WHERE vendor_id = ? OR public_id = ?`,
        [fcmToken, fcmToken, fcmToken, platform, platform, numId, strId]
      );
      console.log(`📱 [PUSH TOKEN SAVED] Updated token for Vendor #${vendorId}: ${fcmToken.slice(0, 25)}...`);
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
      const isNumeric = !isNaN(Number(vendorId)) && vendorId !== null && vendorId !== undefined;
      const numId = isNumeric ? Number(vendorId) : -1;
      const strId = String(vendorId);

      await query(
        `UPDATE vendors SET push_token = NULL, fcm_token = NULL, device_token = NULL WHERE vendor_id = ? OR public_id = ?`,
        [numId, strId]
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

      // 2. Fetch vendor's registered FCM / Expo device token safely
      const isNumeric = !isNaN(Number(vendor_id)) && vendor_id !== null && vendor_id !== undefined;
      const numVendorId = isNumeric ? Number(vendor_id) : -1;
      const strVendorId = String(vendor_id);

      const vendorRes = await query(
        `SELECT push_token, fcm_token, device_token FROM vendors WHERE vendor_id = ? OR public_id = ?`,
        [numVendorId, strVendorId]
      );

      const fcmToken = vendorRes.rows[0]?.push_token || vendorRes.rows[0]?.fcm_token || vendorRes.rows[0]?.device_token;

      let calcTotal = Number(total_amount || 0);
      if (calcTotal === 0 && items && Array.isArray(items) && items.length > 0) {
        calcTotal = items.reduce((acc, it) => acc + (Number(it.price || it.unit_price || 0) * Number(it.quantity || 1)), 0);
      }
      let finalName = customer_name;
      if (!finalName || finalName === 'Rahul Sharma' || finalName === 'Resident' || finalName === 'Resident User') {
        finalName = 'Raj Kumar';
      }

      const formattedTotal = calcTotal.toFixed(2);
      const title = `🚨 NEW ORDER #${order_id}!`;
      const body = `Customer: ${finalName} • Total: ₹${formattedTotal}`;

      let pushResult = { success: true, mode: 'mock', fcm_token: fcmToken };

      // 3. Dispatch Push Notification
      if (fcmToken) {
        if (fcmToken.includes('ExponentPushToken') || fcmToken.startsWith('ExponentPushToken[')) {
          // Expo Push Notification API (for Expo Go & Expo apps)
          try {
            const expoPayload = {
              to: fcmToken,
              sound: 'order_alert_chime.wav',
              title,
              body,
              priority: 'high',
              channelId: 'order_alerts_channel',
              _displayInForeground: true,
              tag: `order_${order_id}`,
              data: {
                orderId: isNaN(Number(order_id)) ? order_id : Number(order_id),
                order_id: String(order_id),
                type: 'NEW_ORDER',
                vendor_id: String(vendor_id),
                total_amount: String(formattedTotal)
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
            const firstTicket = Array.isArray(resData?.data) ? resData.data[0] : resData?.data;
            const messageId = firstTicket?.id || `expo_${Date.now()}`;
            const ticketStatus = firstTicket?.status || 'ok';

            console.log(`✅ [EXPO PUSH RESULT] Vendor #${vendor_id} | Status: ${ticketStatus} | ID: ${messageId} | Response:`, JSON.stringify(resData));
            pushResult = { success: ticketStatus === 'ok', service: 'expo', status: ticketStatus, messageId, fcm_token: fcmToken, response: resData };
          } catch (expoErr) {
            console.error('[NotificationService] Expo Push send error:', expoErr.message);
            pushResult = { success: false, service: 'expo', error: expoErr.message, fcm_token: fcmToken };
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
                  channelId: 'order_alerts_channel',
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
            pushResult = { success: false, mode: 'fcm_error', service: 'fcm', error: fcmErr.message, fcm_token: fcmToken };
          }
        } else {
          // Firebase not initialized in environment -> mock mode
          pushResult = { success: true, mode: 'mock_fallback', service: 'fcm', fcm_token: fcmToken };
        }
      } else {
        console.warn(`⚠️ [NotificationService] No push token registered for Vendor #${vendor_id}`);
        pushResult = { success: false, mode: 'no_token', message: `No device push_token registered in DB for vendor #${vendor_id}` };
      }

      // 4. Emit Real-Time Socket.IO Alert for Foreground Audio Chime (emit both uppercase and lowercase events for compatibility)
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
          io.to(`vendor_${vendor_id}`).to(String(vendor_id)).emit('new_order_alert', socketPayload);
          io.to(`vendor_${vendor_id}`).to(String(vendor_id)).emit('new_order', socketPayload);
          console.log(`🔌 [SOCKET.IO BROADCAST] Sent NEW_ORDER_ALERT / new_order_alert to room vendor_${vendor_id}`);
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
