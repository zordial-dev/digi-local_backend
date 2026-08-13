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
  const payload = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  if (pagination) {
    payload.pagination = pagination;
  }

  return res.status(statusCode).json(payload);
}

function sendStandardError(res, statusCode = 400, message = 'An error occurred.', errorCode = 'BAD_REQUEST') {
  return res.status(statusCode).json({
    success: false,
    error_code: errorCode,
    message,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  sendStandardResponse,
  sendStandardError
};
