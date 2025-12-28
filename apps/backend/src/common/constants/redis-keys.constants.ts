export const REDIS_KEYS = {
  // Rate limiting keys
  RATE_LIMIT: (apiKeyId: string) => `rate_limit:${apiKeyId}`,
  RATE_LIMIT_BLOCKED: (apiKeyId: string) => `rate_limit:${apiKeyId}:blocked`,

  // API Key caching (Day 19 - Performance)
  API_KEY_CACHE: (keyHash: string) => `api_key:${keyHash}`,
  API_KEY_VALID: (keyHash: string) => `api_key:${keyHash}:valid`,

  // User authentication
  REFRESH_TOKEN: (userId: string, tokenId: string) =>
    `refresh_token:${userId}:${tokenId}`,

  // JWT blacklist for logout - stores blacklisted access token JTIs
  JWT_BLACKLIST: (jti: string) => `jwt_blacklist:${jti}`,

  // Gateway response caching
  CACHE_RESPONSE: (method: string, path: string, queryHash: string) =>
    `cache:${method}:${path}:${queryHash}`,

  // Analytics aggregations (for dashboard)
  ANALYTICS_HOURLY: (apiKeyId: string, hour: string) =>
    `analytics:hourly:${apiKeyId}:${hour}`,
  ANALYTICS_DAILY: (apiKeyId: string, date: string) =>
    `analytics:daily:${apiKeyId}:${date}`,
} as const;

export const REDIS_TTL = {
  RATE_LIMIT_WINDOW: 60, // 60 seconds (1 minute)
  RATE_LIMIT_BLOCK: 60, // 1 minute block duration
  API_KEY_CACHE: 300, // 5 minutes (Day 19 - Cache validation)
  RESPONSE_CACHE: 60, // 1 minute
  ANALYTICS_HOURLY: 86400, // 24 hours
  ANALYTICS_DAILY: 604800, // 7 days
  REFRESH_TOKEN: 604800, // 7 days
  JWT_BLACKLIST: 900, // 15 minutes (matches access token expiry)
} as const;
