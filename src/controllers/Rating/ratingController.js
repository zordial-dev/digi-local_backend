const { query, recalculateVendorRating } = require('../../models/db');

/**
 * Standard Success Response Helper
 */
function respond(res, status, data, message = 'Success') {
  return res.status(status).json({
    success: true,
    message,
    data
  });
}

/**
 * Standard Error Response Helper
 */
function sendStandardError(res, status, message, code = 'ERROR') {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message
    }
  });
}

/**
 * POST /api/vendors/:vendorId/ratings OR POST /api/ratings
 * Allows a user to submit a rating & review for a vendor.
 */
async function submitRating(req, res) {
  try {
    const vendorId = req.params.vendorId || req.params.venderId || req.params.id || req.body?.vendor_id || req.body?.vendorId || req.query?.vendor_id || req.query?.vendorId;
    const { rating, review_text, reviewText, user_id, userId, user_name, userName, order_id, orderId } = req.body || {};

    const targetVendorId = Number(vendorId);
    if (!targetVendorId || isNaN(targetVendorId)) {
      return sendStandardError(res, 400, 'Invalid or missing vendor_id', 'INVALID_VENDOR_ID');
    }

    // Verify vendor exists
    const vCheck = await query(`SELECT vendor_id, store_name FROM vendors WHERE vendor_id = ?`, [targetVendorId]);
    if (!vCheck.rows || vCheck.rows.length === 0) {
      return sendStandardError(res, 404, `Vendor with ID ${targetVendorId} not found`, 'VENDOR_NOT_FOUND');
    }

    const numericRating = parseFloat(rating);
    if (isNaN(numericRating) || numericRating < 1.0 || numericRating > 5.0) {
      return sendStandardError(res, 400, 'Rating must be a number between 1.0 and 5.0 stars', 'INVALID_RATING_VALUE');
    }

    const finalUserId = String(user_id || userId || req.user?.user_id || `usr_guest_${Date.now()}`).trim();
    const finalUserName = String(user_name || userName || req.user?.name || 'Valued Customer').trim();
    const finalReviewText = String(review_text || reviewText || '').trim();
    const finalOrderId = order_id || orderId ? String(order_id || orderId).trim() : null;

    const insRes = await query(
      `INSERT INTO vendor_ratings (vendor_id, user_id, user_name, rating, review_text, order_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [targetVendorId, finalUserId, finalUserName, numericRating, finalReviewText, finalOrderId]
    );

    const insertedRating = insRes.rows[0] || {};
    const updatedMetrics = await recalculateVendorRating(targetVendorId);

    return respond(res, 201, {
      rating_id: Number(insertedRating.rating_id || insRes.insertId),
      vendor_id: targetVendorId,
      user_id: finalUserId,
      user_name: finalUserName,
      rating: numericRating,
      review_text: finalReviewText,
      order_id: finalOrderId,
      status: insertedRating.status || 'PUBLISHED',
      created_at: insertedRating.created_at || new Date().toISOString(),
      vendor_summary: updatedMetrics
    }, 'Vendor rating and review submitted successfully.');
  } catch (err) {
    console.error('Error submitting vendor rating:', err);
    return sendStandardError(res, 500, err.message || 'Failed to submit vendor rating');
  }
}

/**
 * GET /api/vendors/:vendorId/ratings
 * Get public ratings & reviews for a vendor with pagination & star breakdown summary.
 */
async function getVendorRatings(req, res) {
  try {
    const targetVendorId = Number(req.params.vendorId || req.params.venderId || req.params.id || req.query?.vendor_id || req.query?.vendorId);
    if (!targetVendorId || isNaN(targetVendorId)) {
      return sendStandardError(res, 400, 'Invalid or missing vendor_id', 'INVALID_VENDOR_ID');
    }

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const starFilter = req.query.star ? parseFloat(req.query.star) : null;

    let sql = `SELECT rating_id, vendor_id, user_id, user_name, rating, review_text, order_id, status, reply_text, replied_at, created_at FROM vendor_ratings WHERE vendor_id = ? AND status = 'PUBLISHED'`;
    const params = [targetVendorId];

    if (starFilter && !isNaN(starFilter)) {
      sql += ` AND rating = ?`;
      params.push(starFilter);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const ratingsRes = await query(sql, params).catch(() => ({ rows: [] }));

    // Count total published ratings
    const countRes = await query(
      `SELECT COUNT(*) as total FROM vendor_ratings WHERE vendor_id = ? AND status = 'PUBLISHED'`,
      [targetVendorId]
    );
    const totalCount = parseInt(countRes.rows[0]?.total || 0, 10);

    // Star breakdown distribution
    const breakdownRes = await query(
      `SELECT 
        COUNT(CASE WHEN rating >= 4.5 THEN 1 END) as star_5,
        COUNT(CASE WHEN rating >= 3.5 AND rating < 4.5 THEN 1 END) as star_4,
        COUNT(CASE WHEN rating >= 2.5 AND rating < 3.5 THEN 1 END) as star_3,
        COUNT(CASE WHEN rating >= 1.5 AND rating < 2.5 THEN 1 END) as star_2,
        COUNT(CASE WHEN rating < 1.5 THEN 1 END) as star_1,
        COALESCE(AVG(rating), 0) as avg_rating,
        COALESCE(SUM(rating), 0) as total_sum
       FROM vendor_ratings WHERE vendor_id = ? AND status = 'PUBLISHED'`,
      [targetVendorId]
    );

    const bd = breakdownRes.rows[0] || {};
    const avgRating = Math.round(parseFloat(bd.avg_rating || 0) * 100) / 100;

    return respond(res, 200, {
      vendor_id: targetVendorId,
      summary: {
        avg_rating: avgRating,
        total_ratings: totalCount,
        breakdown: {
          5: parseInt(bd.star_5 || 0, 10),
          4: parseInt(bd.star_4 || 0, 10),
          3: parseInt(bd.star_3 || 0, 10),
          2: parseInt(bd.star_2 || 0, 10),
          1: parseInt(bd.star_1 || 0, 10)
        }
      },
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit) || 1
      },
      ratings: ratingsRes.rows.map(r => ({
        rating_id: Number(r.rating_id),
        vendor_id: Number(r.vendor_id),
        user_id: r.user_id,
        user_name: r.user_name,
        rating: parseFloat(r.rating),
        review_text: r.review_text || '',
        order_id: r.order_id,
        status: r.status,
        reply_text: r.reply_text || null,
        replied_at: r.replied_at || null,
        created_at: r.created_at
      }))
    }, 'Vendor ratings retrieved successfully.');
  } catch (err) {
    console.error('Error fetching vendor ratings:', err);
    return sendStandardError(res, 500, 'Failed to fetch vendor ratings');
  }
}

/**
 * GET /api/vendors/:vendorId/ratings/summary
 * Quick rating summary & star distribution specs for vendor card or detail header.
 */
async function getVendorRatingSummary(req, res) {
  try {
    const targetVendorId = Number(req.params.vendorId || req.params.venderId || req.params.id || req.query?.vendor_id || req.query?.vendorId);
    if (!targetVendorId || isNaN(targetVendorId)) {
      return sendStandardError(res, 400, 'Invalid or missing vendor_id', 'INVALID_VENDOR_ID');
    }

    const summaryRes = await query(
      `SELECT 
        COUNT(*) as total_ratings,
        COALESCE(AVG(rating), 0) as avg_rating,
        COUNT(CASE WHEN rating >= 4.5 THEN 1 END) as star_5,
        COUNT(CASE WHEN rating >= 3.5 AND rating < 4.5 THEN 1 END) as star_4,
        COUNT(CASE WHEN rating >= 2.5 AND rating < 3.5 THEN 1 END) as star_3,
        COUNT(CASE WHEN rating >= 1.5 AND rating < 2.5 THEN 1 END) as star_2,
        COUNT(CASE WHEN rating < 1.5 THEN 1 END) as star_1
       FROM vendor_ratings WHERE vendor_id = ? AND status = 'PUBLISHED'`,
      [targetVendorId]
    );

    const s = summaryRes.rows[0] || {};
    const total = parseInt(s.total_ratings || 0, 10);
    const avgRating = Math.round(parseFloat(s.avg_rating || 0) * 100) / 100;

    return respond(res, 200, {
      vendor_id: targetVendorId,
      avg_rating: avgRating,
      rating_count: total,
      star_breakdown: {
        5: parseInt(s.star_5 || 0, 10),
        4: parseInt(s.star_4 || 0, 10),
        3: parseInt(s.star_3 || 0, 10),
        2: parseInt(s.star_2 || 0, 10),
        1: parseInt(s.star_1 || 0, 10)
      }
    }, 'Vendor rating summary fetched successfully.');
  } catch (err) {
    console.error('Error fetching rating summary:', err);
    return sendStandardError(res, 500, 'Failed to fetch rating summary');
  }
}

/**
 * GET /api/vendor/ratings, GET /api/vendor/reviews, GET /api/vendorPanel/:vendorId/reviews, etc.
 * Allows vendor to fetch and see all reviews and ratings submitted by users.
 */
async function getVendorSelfRatings(req, res) {
  try {
    const vendorIdHeader = req.headers['x-vendor-id'] || req.headers['vendor_id'] || req.headers['x-vendor-id'.toLowerCase()];
    const targetVendorId = Number(
      req.params.vendorId ||
      req.params.venderId ||
      req.params.id ||
      req.user?.vendor_id ||
      req.user?.id ||
      vendorIdHeader ||
      req.query.vendor_id ||
      req.query.vendorId
    );

    if (!targetVendorId || isNaN(targetVendorId)) {
      return sendStandardError(res, 400, 'Vendor identification missing. Please provide vendor ID parameter, X-Vendor-ID header, or vendor auth token.', 'UNAUTHORIZED_VENDOR');
    }

    // Verify vendor exists
    const vCheck = await query(`SELECT vendor_id, store_name, vendor_name FROM vendors WHERE vendor_id = ?`, [targetVendorId]);
    if (!vCheck.rows || vCheck.rows.length === 0) {
      return sendStandardError(res, 404, `Vendor with ID ${targetVendorId} not found`, 'VENDOR_NOT_FOUND');
    }

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;
    const starFilter = req.query.star ? parseFloat(req.query.star) : null;

    let sql = `SELECT rating_id, vendor_id, user_id, user_name, rating, review_text, order_id, status, reply_text, replied_at, created_at
               FROM vendor_ratings WHERE vendor_id = ? AND status = 'PUBLISHED'`;
    const params = [targetVendorId];

    if (starFilter && !isNaN(starFilter)) {
      sql += ` AND rating = ?`;
      params.push(starFilter);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const ratingsRes = await query(sql, params).catch(() => ({ rows: [] }));

    const summaryRes = await query(
      `SELECT 
        COUNT(*) as total_ratings,
        COALESCE(AVG(rating), 0) as avg_rating,
        COUNT(CASE WHEN rating >= 4.5 THEN 1 END) as star_5,
        COUNT(CASE WHEN rating >= 3.5 AND rating < 4.5 THEN 1 END) as star_4,
        COUNT(CASE WHEN rating >= 2.5 AND rating < 3.5 THEN 1 END) as star_3,
        COUNT(CASE WHEN rating >= 1.5 AND rating < 2.5 THEN 1 END) as star_2,
        COUNT(CASE WHEN rating < 1.5 THEN 1 END) as star_1
       FROM vendor_ratings WHERE vendor_id = ? AND status = 'PUBLISHED'`,
      [targetVendorId]
    );

    const s = summaryRes.rows[0] || {};
    const total = parseInt(s.total_ratings || 0, 10);
    const avgRating = Math.round(parseFloat(s.avg_rating || 0) * 100) / 100;

    const formattedList = ratingsRes.rows.map(r => ({
      rating_id: Number(r.rating_id),
      vendor_id: Number(r.vendor_id),
      user_id: r.user_id,
      user_name: r.user_name || 'Valued Customer',
      rating: parseFloat(r.rating),
      review_text: r.review_text || '',
      order_id: r.order_id || null,
      status: r.status,
      reply_text: r.reply_text || null,
      replied_at: r.replied_at || null,
      created_at: r.created_at
    }));

    return respond(res, 200, {
      vendor_id: targetVendorId,
      store_name: vCheck.rows[0].store_name || '',
      metrics: {
        avg_rating: avgRating,
        rating_count: total,
        total_reviews: total,
        breakdown: {
          5: parseInt(s.star_5 || 0, 10),
          4: parseInt(s.star_4 || 0, 10),
          3: parseInt(s.star_3 || 0, 10),
          2: parseInt(s.star_2 || 0, 10),
          1: parseInt(s.star_1 || 0, 10)
        }
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      },
      ratings: formattedList,
      reviews: formattedList
    }, 'Vendor user ratings and reviews retrieved successfully.');
  } catch (err) {
    console.error('Error in vendor self ratings:', err);
    return sendStandardError(res, 500, 'Failed to retrieve vendor rating statistics');
  }
}

/**
 * POST /api/vendor/ratings/:ratingId/reply
 * Vendor posts a response/reply to a customer review.
 */
async function replyToRating(req, res) {
  try {
    const ratingId = Number(req.params.ratingId);
    const { reply_text, replyText } = req.body;
    const textToSave = String(reply_text || replyText || '').trim();

    if (!ratingId || isNaN(ratingId)) {
      return sendStandardError(res, 400, 'Invalid rating_id', 'INVALID_RATING_ID');
    }

    if (!textToSave) {
      return sendStandardError(res, 400, 'Reply text is required', 'MISSING_REPLY_TEXT');
    }

    const rCheck = await query(`SELECT rating_id, vendor_id FROM vendor_ratings WHERE rating_id = ?`, [ratingId]);
    if (!rCheck.rows || rCheck.rows.length === 0) {
      return sendStandardError(res, 404, `Rating with ID ${ratingId} not found`, 'RATING_NOT_FOUND');
    }

    const updatedRes = await query(
      `UPDATE vendor_ratings 
       SET reply_text = ?, replied_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE rating_id = ? RETURNING *`,
      [textToSave, ratingId]
    );

    const row = updatedRes.rows[0] || {};

    return respond(res, 200, {
      rating_id: ratingId,
      vendor_id: Number(row.vendor_id),
      reply_text: textToSave,
      replied_at: row.replied_at || new Date().toISOString()
    }, 'Vendor reply published successfully.');
  } catch (err) {
    console.error('Error publishing vendor reply:', err);
    return sendStandardError(res, 500, 'Failed to publish vendor reply');
  }
}

/**
 * GET /api/admin/vendor-ratings
 * Admin list and filter vendor ratings across platform.
 */
async function getAllAdminRatings(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const { vendor_id, status, search, min_rating, max_rating } = req.query;

    let sql = `
      SELECT r.rating_id, r.vendor_id, v.store_name, v.vendor_name, r.user_id, r.user_name, r.rating, r.review_text, r.order_id, r.status, r.reply_text, r.replied_at, r.created_at
      FROM vendor_ratings r
      LEFT JOIN vendors v ON r.vendor_id = v.vendor_id
      WHERE 1=1
    `;
    const params = [];

    if (vendor_id) {
      sql += ` AND r.vendor_id = ?`;
      params.push(Number(vendor_id));
    }

    if (status) {
      sql += ` AND LOWER(r.status) = LOWER(?)`;
      params.push(String(status).trim());
    }

    if (min_rating) {
      sql += ` AND r.rating >= ?`;
      params.push(parseFloat(min_rating));
    }

    if (max_rating) {
      sql += ` AND r.rating <= ?`;
      params.push(parseFloat(max_rating));
    }

    if (search) {
      sql += ` AND (LOWER(r.user_name) LIKE ? OR LOWER(r.review_text) LIKE ? OR LOWER(v.store_name) LIKE ?)`;
      const kw = `%${String(search).trim().toLowerCase()}%`;
      params.push(kw, kw, kw);
    }

    sql += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const ratingsRes = await query(sql, params).catch(() => ({ rows: [] }));

    // Count overall query
    let countSql = `SELECT COUNT(*) as total FROM vendor_ratings r LEFT JOIN vendors v ON r.vendor_id = v.vendor_id WHERE 1=1`;
    const countParams = [];
    if (vendor_id) { countSql += ` AND r.vendor_id = ?`; countParams.push(Number(vendor_id)); }
    if (status) { countSql += ` AND LOWER(r.status) = LOWER(?)`; countParams.push(String(status).trim()); }
    if (search) {
      countSql += ` AND (LOWER(r.user_name) LIKE ? OR LOWER(r.review_text) LIKE ? OR LOWER(v.store_name) LIKE ?)`;
      const kw = `%${String(search).trim().toLowerCase()}%`;
      countParams.push(kw, kw, kw);
    }

    const countRes = await query(countSql, countParams).catch(() => ({ rows: [{ total: 0 }] }));
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    return respond(res, 200, {
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      },
      ratings: ratingsRes.rows.map(r => ({
        rating_id: Number(r.rating_id),
        vendor_id: Number(r.vendor_id),
        store_name: r.store_name || 'N/A',
        vendor_name: r.vendor_name || 'N/A',
        user_id: r.user_id,
        user_name: r.user_name,
        rating: parseFloat(r.rating),
        review_text: r.review_text || '',
        order_id: r.order_id,
        status: r.status,
        reply_text: r.reply_text || null,
        replied_at: r.replied_at || null,
        created_at: r.created_at
      }))
    }, 'Admin vendor ratings retrieved.');
  } catch (err) {
    console.error('Error fetching admin vendor ratings:', err);
    return sendStandardError(res, 500, 'Failed to fetch admin vendor ratings');
  }
}

/**
 * PATCH /api/admin/vendor-ratings/:ratingId/status
 * Admin updates status of a rating (PUBLISHED, HIDDEN, FLAGGED)
 */
async function updateAdminRatingStatus(req, res) {
  try {
    const ratingId = Number(req.params.ratingId);
    const { status } = req.body;
    const allowedStatuses = ['PUBLISHED', 'HIDDEN', 'FLAGGED'];

    const targetStatus = String(status || '').trim().toUpperCase();
    if (!allowedStatuses.includes(targetStatus)) {
      return sendStandardError(res, 400, `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`, 'INVALID_STATUS');
    }

    const rCheck = await query(`SELECT rating_id, vendor_id FROM vendor_ratings WHERE rating_id = ?`, [ratingId]);
    if (!rCheck.rows || rCheck.rows.length === 0) {
      return sendStandardError(res, 404, `Rating ID ${ratingId} not found`, 'RATING_NOT_FOUND');
    }

    const vendorId = Number(rCheck.rows[0].vendor_id);

    await query(
      `UPDATE vendor_ratings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE rating_id = ?`,
      [targetStatus, ratingId]
    );

    const updatedMetrics = await recalculateVendorRating(vendorId);

    return respond(res, 200, {
      rating_id: ratingId,
      vendor_id: vendorId,
      status: targetStatus,
      vendor_summary: updatedMetrics
    }, `Rating status updated to ${targetStatus}. Vendor aggregate metrics recalculated.`);
  } catch (err) {
    console.error('Error updating admin rating status:', err);
    return sendStandardError(res, 500, 'Failed to update rating status');
  }
}

/**
 * DELETE /api/admin/vendor-ratings/:ratingId
 * Admin permanently deletes a rating & recalculates vendor aggregate.
 */
async function deleteAdminRating(req, res) {
  try {
    const ratingId = Number(req.params.ratingId);
    const rCheck = await query(`SELECT rating_id, vendor_id FROM vendor_ratings WHERE rating_id = ?`, [ratingId]);

    if (!rCheck.rows || rCheck.rows.length === 0) {
      return sendStandardError(res, 404, `Rating ID ${ratingId} not found`, 'RATING_NOT_FOUND');
    }

    const vendorId = Number(rCheck.rows[0].vendor_id);

    await query(`DELETE FROM vendor_ratings WHERE rating_id = ?`, [ratingId]);
    const updatedMetrics = await recalculateVendorRating(vendorId);

    return respond(res, 200, {
      deleted_rating_id: ratingId,
      vendor_id: vendorId,
      vendor_summary: updatedMetrics
    }, 'Rating deleted successfully and vendor score recalculated.');
  } catch (err) {
    console.error('Error deleting admin vendor rating:', err);
    return sendStandardError(res, 500, 'Failed to delete vendor rating');
  }
}

module.exports = {
  submitRating,
  getVendorRatings,
  getVendorRatingSummary,
  getVendorSelfRatings,
  replyToRating,
  getAllAdminRatings,
  updateAdminRatingStatus,
  deleteAdminRating
};
