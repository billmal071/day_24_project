/**
 * Analytics-related constants
 */

// Query defaults and limits
export const ANALYTICS_QUERY = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,

  // Dashboard-specific limits
  RECENT_LOGS_LIMIT: 10,
  TOP_ENDPOINTS_LIMIT: 5,
  ENDPOINT_STATS_LIMIT: 20,
} as const;

// Time ranges (milliseconds)
export const ANALYTICS_TIME_RANGE = {
  DEFAULT_RANGE_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Cache key configuration
export const CACHE_CONFIG = {
  QUERY_HASH_LENGTH: 8,
} as const;
