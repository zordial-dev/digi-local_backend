const { admin, isFirebaseAvailable } = require('../config/firebase');
const { query } = require('../models/db');

/**
 * Service for dispatching high-priority Zomato/Swiggy-style sound push notifications via FCM,
 * Expo Push API (Expo Go), and real-time Socket.IO alerts to Vendor Mobile Apps.
 */
class NotificationService {
  constructor() {
    this.processedOrders = new Set();
    this.processedEnquiries = new Set();
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
  async notifyVendorNewOrder({ vendor_id, order_id, total_amount, customer_name, items_count = 1, items = [], remarks = '', delivery_address = '' }) {
    try {
      // 1. Deduplication Guard: Check in-memory deduplication set
      const cleanOrderId = order_id ? String(order_id).trim() : null;
      if (cleanOrderId && this.processedOrders.has(cleanOrderId)) {
        console.log(`ℹ️ [PUSH DEDUP] Notification already sent for order #${cleanOrderId}. Bypassing duplicate.`);
        return { success: true, bypassed: true, message: 'Notification already sent for this order_id' };
      }

      // Check database to see if vendor was already notified for this order
      if (cleanOrderId) {
        const dbCheck = await query(
          `SELECT vendor_notified, cashfree_order_id FROM orders WHERE order_id = ? OR cashfree_order_id = ?`,
          [cleanOrderId, cleanOrderId]
        ).catch(() => ({ rows: [] }));

        if (dbCheck.rows && dbCheck.rows[0]?.vendor_notified === true) {
          console.log(`ℹ️ [PUSH DEDUP] Database indicates notification already sent for order #${cleanOrderId}. Bypassing duplicate.`);
          this.processedOrders.add(cleanOrderId);
          return { success: true, bypassed: true, message: 'Notification already sent for this order_id' };
        }

        this.processedOrders.add(cleanOrderId);
        if (dbCheck.rows?.[0]?.cashfree_order_id) {
          this.processedOrders.add(String(dbCheck.rows[0].cashfree_order_id));
        }
        if (this.processedOrders.size > 1000) {
          const firstKey = this.processedOrders.values().next().value;
          this.processedOrders.delete(firstKey);
        }

        await query(
          `UPDATE orders SET vendor_notified = TRUE, vendor_notified_at = CURRENT_TIMESTAMP WHERE order_id = ? OR cashfree_order_id = ?`,
          [cleanOrderId, cleanOrderId]
        ).catch(() => {});
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
      if (!finalName || finalName === 'Resident' || finalName === 'Resident User') {
        finalName = 'Customer';
      }

      const formattedTotal = calcTotal.toFixed(2);
      const title = `NEW ORDER #${order_id}!`;
      let body = `Customer: ${finalName} • Total: ₹${formattedTotal}`;
      if (remarks) {
        body += ` • Note: "${remarks}"`;
      }

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
              categoryId: 'NEW_ORDER_ACTIONS',
              _displayInForeground: true,
              tag: `order_${order_id}`,
              data: {
                orderId: isNaN(Number(order_id)) ? order_id : Number(order_id),
                order_id: String(order_id),
                type: 'NEW_ORDER',
                vendor_id: String(vendor_id),
                total_amount: String(formattedTotal),
                customer_name: finalName,
                remarks: String(remarks || ''),
                notes: String(remarks || ''),
                delivery_instructions: String(remarks || ''),
                delivery_address: String(delivery_address || ''),
                actions: ['ACCEPT', 'REJECT', 'MUTE']
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
                  visibility: 'public',
                  clickAction: 'NEW_ORDER_ACTIONS'
                }
              },
              apns: {
                payload: {
                  aps: {
                    sound: 'new_order_alert_sound.caf',
                    badge: 1,
                    category: 'NEW_ORDER_ACTIONS'
                  }
                }
              },
              data: {
                type: 'NEW_ORDER_RECEIVED',
                order_id: String(order_id),
                vendor_id: String(vendor_id),
                total_amount: String(formattedTotal),
                customer_name: finalName,
                remarks: String(remarks || ''),
                notes: String(remarks || ''),
                delivery_instructions: String(remarks || ''),
                delivery_address: String(delivery_address || ''),
                sound: 'new_order_alert_sound',
                actions: JSON.stringify(['ACCEPT', 'REJECT', 'MUTE'])
              }
            };

            const messageId = await admin.messaging().send(message);
            console.log(`[FCM PUSH SUCCESS] Sent to Vendor #${vendor_id} | Message ID: ${messageId}`);
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
        console.warn(`[NotificationService] No push token registered for Vendor #${vendor_id}`);
        pushResult = { success: false, mode: 'no_token', message: `No device push_token registered in DB for vendor #${vendor_id}` };
      }

      // 4. Emit Real-Time Socket.IO Alert to vendor panel & vendor app
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
            remarks: String(remarks || ''),
            notes: String(remarks || ''),
            delivery_instructions: String(remarks || ''),
            delivery_address: String(delivery_address || ''),
            payment_method: String(pushResult?.payment_method || ''),
            timestamp: new Date().toISOString(),
            sound: 'new_order_alert_sound'
          };

          // Emit to both named and plain ID rooms for maximum compatibility
          // (web panel may join as vendor_${id}, mobile app may join as String(id))
          io.to(`vendor_${vendor_id}`).emit('NEW_ORDER_ALERT', socketPayload);
          io.to(String(vendor_id)).emit('NEW_ORDER_ALERT', socketPayload);
          console.log(`🔌 [SOCKET.IO] NEW_ORDER_ALERT → rooms: vendor_${vendor_id}, ${vendor_id}`);
        } else {
          console.warn(`⚠️ [SOCKET.IO] io not initialized — NEW_ORDER_ALERT NOT sent for order #${order_id}. Vendor must refresh manually.`);
        }
      } catch (wsErr) {
        console.error(`❌ [SOCKET.IO] Failed to emit NEW_ORDER_ALERT for order #${order_id}:`, wsErr.message);
      }

      return pushResult;
    } catch (err) {
      console.error('[NotificationService] Error notifying vendor of new order:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sends high-priority In-App Notification (Socket.IO) & Push Notification (FCM / Expo) to Service Vendor on New Enquiry.
   */
  async notifyVendorNewEnquiry({
    vendor_id,
    enquiry_id,
    user_name,
    user_phone,
    service_type = 'General Service',
    preferred_time = 'ASAP',
    description = '',
    society_name = '',
    sector = '',
    created_at = null
  }) {
    try {
      // 1. Deduplication Guard: Check in-memory deduplication set
      const cleanEnquiryId = enquiry_id ? String(enquiry_id).trim() : null;
      if (cleanEnquiryId && this.processedEnquiries.has(cleanEnquiryId)) {
        console.log(`ℹ️ [ENQUIRY DEDUP] Notification already sent for enquiry #${cleanEnquiryId}. Bypassing duplicate.`);
        return { success: true, bypassed: true, message: 'Notification already sent for this enquiry_id' };
      }

      // Check database to see if vendor was already notified for this enquiry
      if (cleanEnquiryId) {
        const dbCheck = await query(
          `SELECT vendor_notified FROM enquiries WHERE enquiry_id = ? OR CAST(enquiry_id AS TEXT) = ?`,
          [isNaN(Number(cleanEnquiryId)) ? -1 : Number(cleanEnquiryId), cleanEnquiryId]
        ).catch(() => ({ rows: [] }));

        if (dbCheck.rows && dbCheck.rows[0]?.vendor_notified === true) {
          console.log(`ℹ️ [ENQUIRY DEDUP] Database indicates notification already sent for enquiry #${cleanEnquiryId}. Bypassing duplicate.`);
          this.processedEnquiries.add(cleanEnquiryId);
          return { success: true, bypassed: true, message: 'Notification already sent for this enquiry_id' };
        }

        this.processedEnquiries.add(cleanEnquiryId);
        if (this.processedEnquiries.size > 1000) {
          const firstKey = this.processedEnquiries.values().next().value;
          this.processedEnquiries.delete(firstKey);
        }

        await query(
          `UPDATE enquiries SET vendor_notified = TRUE, vendor_notified_at = CURRENT_TIMESTAMP WHERE enquiry_id = ? OR CAST(enquiry_id AS TEXT) = ?`,
          [isNaN(Number(cleanEnquiryId)) ? -1 : Number(cleanEnquiryId), cleanEnquiryId]
        ).catch(() => {});
      }

      // 2. Fetch target vendor's registered FCM / Expo device token
      const isNumeric = !isNaN(Number(vendor_id)) && vendor_id !== null && vendor_id !== undefined;
      const numVendorId = isNumeric ? Number(vendor_id) : -1;
      const strVendorId = String(vendor_id);

      const vendorRes = await query(
        `SELECT push_token, fcm_token, device_token FROM vendors WHERE vendor_id = ? OR public_id = ?`,
        [numVendorId, strVendorId]
      );

      const fcmToken = vendorRes.rows[0]?.push_token || vendorRes.rows[0]?.fcm_token || vendorRes.rows[0]?.device_token;

      const customerName = user_name || 'Resident';
      const title = `NEW SERVICE ENQUIRY #${enquiry_id}!`;
      let body = `${customerName} requested ${service_type}`;
      if (preferred_time) body += ` • Slot: ${preferred_time}`;
      if (description) body += ` • Note: "${description}"`;

      let pushResult = { success: true, mode: 'mock', fcm_token: fcmToken };

      // 3. Dispatch Push Notification (Expo or FCM Native)
      if (fcmToken) {
        if (fcmToken.includes('ExponentPushToken') || fcmToken.startsWith('ExponentPushToken[')) {
          // Expo Push Notification API
          try {
            const expoPayload = {
              to: fcmToken,
              sound: 'order_alert_chime.wav',
              title,
              body,
              priority: 'high',
              channelId: 'enquiry_alerts_channel',
              categoryId: 'NEW_ENQUIRY_ACTIONS',
              _displayInForeground: true,
              tag: `enquiry_${enquiry_id}`,
              data: {
                enquiryId: isNaN(Number(enquiry_id)) ? enquiry_id : Number(enquiry_id),
                enquiry_id: String(enquiry_id),
                type: 'NEW_SERVICE_ENQUIRY',
                vendor_id: String(vendor_id),
                customer_name: customerName,
                customer_phone: user_phone || '',
                service_type,
                preferred_time,
                description: String(description || ''),
                society_name: String(society_name || ''),
                sector: String(sector || ''),
                actions: ['VIEW', 'CALL']
              },
              ttl: 120,
              expiration: Math.floor(Date.now() / 1000) + 120
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
            console.log(`✅ [EXPO PUSH ENQUIRY] Vendor #${vendor_id} | Status: ${ticketStatus} | ID: ${messageId}`);
            pushResult = { success: ticketStatus === 'ok', service: 'expo', status: ticketStatus, messageId, fcm_token: fcmToken, response: resData };
          } catch (expoErr) {
            console.error('[NotificationService] Expo Push send error for enquiry:', expoErr.message);
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
                  channelId: 'enquiry_alerts_channel',
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
                type: 'NEW_SERVICE_ENQUIRY',
                enquiry_id: String(enquiry_id),
                vendor_id: String(vendor_id),
                customer_name: customerName,
                customer_phone: String(user_phone || ''),
                service_type: String(service_type || ''),
                preferred_time: String(preferred_time || ''),
                description: String(description || ''),
                society_name: String(society_name || ''),
                sector: String(sector || ''),
                sound: 'new_order_alert_sound'
              }
            };

            const messageId = await admin.messaging().send(message);
            console.log(`[FCM PUSH ENQUIRY SUCCESS] Sent to Vendor #${vendor_id} | Message ID: ${messageId}`);
            pushResult = { success: true, mode: 'fcm', service: 'fcm', messageId, fcm_token: fcmToken };
          } catch (fcmErr) {
            console.error('[NotificationService] FCM send error for enquiry:', fcmErr.message);
            pushResult = { success: false, mode: 'fcm_error', service: 'fcm', error: fcmErr.message, fcm_token: fcmToken };
          }
        } else {
          pushResult = { success: true, mode: 'mock_fallback', service: 'fcm', fcm_token: fcmToken };
        }
      } else {
        pushResult = { success: false, mode: 'no_token', message: `No device push_token registered in DB for vendor #${vendor_id}` };
      }

      // 4. Emit Real-Time Socket.IO Alert to vendor panel & vendor mobile app
      try {
        const { getIO } = require('../socket');
        const io = getIO();
        if (io) {
          const socketPayload = {
            enquiry_id: Number(enquiry_id),
            vendor_id: Number(vendor_id),
            customer_name: customerName,
            user_name: customerName,
            customer_phone: user_phone || '',
            user_phone: user_phone || '',
            service_type,
            preferred_time,
            description: String(description || ''),
            society_name: String(society_name || ''),
            sector: String(sector || ''),
            status: 'NEW',
            created_at: created_at || new Date().toISOString(),
            timestamp: new Date().toISOString(),
            sound: 'new_order_alert_sound'
          };

          io.to(`vendor_${vendor_id}`).emit('NEW_ENQUIRY_ALERT', socketPayload);
          io.to(String(vendor_id)).emit('NEW_ENQUIRY_ALERT', socketPayload);
          console.log(`🔌 [SOCKET.IO] NEW_ENQUIRY_ALERT → rooms: vendor_${vendor_id}, ${vendor_id}`);
        } else {
          console.warn(`⚠️ [SOCKET.IO] io not initialized — NEW_ENQUIRY_ALERT NOT sent for enquiry #${enquiry_id}`);
        }
      } catch (wsErr) {
        console.error(`❌ [SOCKET.IO] Failed to emit NEW_ENQUIRY_ALERT for enquiry #${enquiry_id}:`, wsErr.message);
      }

      return pushResult;
    } catch (err) {
      console.error('[NotificationService] Error notifying vendor of new enquiry:', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new NotificationService();
