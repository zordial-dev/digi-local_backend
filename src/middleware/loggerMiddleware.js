const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Express Middleware for Request ID, Correlation ID, and HTTP Request/Response Logging.
 */
function loggerMiddleware(req, res, next) {
  const startTime = Date.now();

  // Generate or propagate Request ID and Correlation ID
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const correlationId = req.headers['x-correlation-id'] || requestId;

  req.id = requestId;
  req.correlationId = correlationId;

  // Set response headers for client tracing
  res.setHeader('x-request-id', requestId);
  res.setHeader('x-correlation-id', correlationId);

  // Intercept response finish event to log Response status & duration for errors/warnings
  res.on('finish', () => {
    const url = req.originalUrl || req.url || '';
    if (url.includes('/socket.io') || url.includes('/favicon.ico')) {
      return; // Skip noisy browser/socket polling 404s
    }

    if (res.statusCode >= 400) {
      const duration = Date.now() - startTime;
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn';

      logger[logLevel](`HTTP ${req.method} ${url} ${res.statusCode} - ${duration}ms`, {
        requestId,
        correlationId,
        method: req.method,
        url,
        statusCode: res.statusCode,
        responseTimeMs: duration
      });
    }
  });

  next();
}

module.exports = { loggerMiddleware };
