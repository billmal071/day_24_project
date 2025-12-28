/**
 * HTTP-related constants
 */

// Timeout values (milliseconds)
export const HTTP_TIMEOUTS = {
  REQUEST_TIMEOUT: 30_000, // 30 seconds
  GATEWAY_TIMEOUT: 30_000,
} as const;

// HTTP client configuration
export const HTTP_CONFIG = {
  MAX_REDIRECTS: 5,
} as const;

// Status code ranges for classification
export const STATUS_CODES = {
  SUCCESS_MIN: 200,
  SUCCESS_MAX: 299,
  REDIRECT_MAX: 399,
  CLIENT_ERROR_MIN: 400,
  SERVER_ERROR_MIN: 500,
  DEFAULT_ERROR: 500,
} as const;

// Security headers
export const SECURITY_HEADERS = {
  HSTS_MAX_AGE: 31_536_000, // 1 year in seconds
} as const;
