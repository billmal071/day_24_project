/**
 * Security and cryptography constants
 */

// Password hashing
export const PASSWORD_HASHING = {
  BCRYPT_SALT_ROUNDS: 10,
} as const;

// Token/key generation (bytes)
export const KEY_GENERATION = {
  TOKEN_ID_BYTES: 16,
  JWT_ID_BYTES: 16,
  API_KEY_BYTES: 32,
  API_KEY_PREFIX_LENGTH: 8,
} as const;

// Redis connection
export const REDIS_CONFIG = {
  MAX_RETRIES_PER_REQUEST: 3,
  RETRY_BACKOFF_MS: 50,
  MAX_RETRY_DELAY_MS: 2000,
} as const;

// Performance monitoring
export const PERFORMANCE = {
  SLOW_QUERY_THRESHOLD_MS: 100,
} as const;
