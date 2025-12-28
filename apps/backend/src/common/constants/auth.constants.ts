/**
 * Authentication-related constants
 */

// Token expiration times
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '7d',
} as const;

// Rate limiting for auth endpoints (milliseconds)
export const AUTH_THROTTLE = {
  // Standard auth window (1 minute)
  WINDOW_MS: 60_000,
  DEFAULT_LIMIT: 5,

  // Strict throttling (15 minutes) for brute force protection
  STRICT_WINDOW_MS: 900_000, // 15 minutes
  STRICT_LIMIT: 10,

  // Per-endpoint limits
  REGISTER_LIMIT: 5,
  LOGIN_LIMIT: 5,
  REFRESH_LIMIT: 10,
} as const;

// Default rate limit for API keys
export const API_KEY_DEFAULTS = {
  RATE_LIMIT: 10, // requests per period
  RATE_PERIOD_MS: 60_000, // 1 minute
} as const;
