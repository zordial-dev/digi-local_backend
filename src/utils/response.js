'use strict';

/**
 * Standard API Response Helper for DigiLocal Backend.
 * Standard Format:
 * {
 *   "success": true | false,
 *   "message": "Operation completed successfully.",
 *   "data": { ... },
 *   "pagination": { "total": 100, "page": 1, "limit": 20, "total_pages": 5 },
 *   "timestamp": "2026-08-12T14:45:00.000Z"
 * }
 */

function sendStandardResponse(res, statusCode = 200, data = {}, message = 'Operation completed successfully.', pagination = null) {
  const req = res?.req;
  let requestId = req?.headers?.['x-request-id'];
  if (!requestId && typeof res?.getHeader === 'function') {
    try { requestId = res.getHeader('x-request-id'); } catch (_) {}
  }
  if (!requestId) requestId = `req_${Date.now()}`;

  const payload = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    request_id: requestId
  };

  if (pagination) {
    const page = Number(pagination.page || 1);
    const limit = Number(pagination.limit || 20);
    const total = Number(pagination.total || 0);
    const total_pages = Number(pagination.total_pages || Math.ceil(total / (limit || 1)) || 1);

    payload.pagination = {
      total,
      page,
      limit,
      total_pages,
      has_next: pagination.has_next !== undefined ? Boolean(pagination.has_next) : page < total_pages,
      has_prev: pagination.has_prev !== undefined ? Boolean(pagination.has_prev) : page > 1
    };
  }

  return res.status(statusCode).json(payload);
}

function sendStandardError(res, statusCode = 400, message = 'An error occurred.', errorCode = 'BAD_REQUEST', details = null) {
  const req = res?.req;
  let requestId = req?.headers?.['x-request-id'];
  if (!requestId && typeof res?.getHeader === 'function') {
    try { requestId = res.getHeader('x-request-id'); } catch (_) {}
  }
  if (!requestId) requestId = `req_${Date.now()}`;

  const formattedDetails = Array.isArray(details)
    ? details
    : (details ? [details] : []);

  return res.status(statusCode).json({
    success: false,
    error_code: errorCode, // Backwards-compatible fallback
    message, // Backwards-compatible fallback
    error: {
      code: errorCode,
      message,
      details: formattedDetails
    },
    timestamp: new Date().toISOString(),
    request_id: requestId
  });
}

module.exports = {
  sendStandardResponse,
  sendStandardError
};
