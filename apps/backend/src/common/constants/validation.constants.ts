/**
 * Validation constants for DTOs
 */

// String length limits
export const STRING_LENGTH = {
  EMAIL_MAX: 255,
  API_KEY_NAME_MAX: 255,
  DESCRIPTION_MAX: 1000,
  USER_AGENT_MAX: 512,
} as const;

// Rate limit configuration bounds
export const RATE_LIMIT_BOUNDS = {
  MAX_REQUESTS: 1000,
  MIN_PERIOD_MS: 1000, // 1 second
  MAX_PERIOD_MS: 3_600_000, // 1 hour
} as const;

// Analytics query limits
export const ANALYTICS_LIMITS = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
} as const;
