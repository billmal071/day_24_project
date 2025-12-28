// API Response types

// Auth types
export interface User {
  id: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  description?: string;
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  id: string;
  key: string;
  keyPrefix: string;
  name: string;
  message: string;
}

export interface AnalyticsOverview {
  period: {
    start: string;
    end: string;
  };
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    errorRate: number;
    avgResponseTime: number;
    activeKeys: number;
  };
  requestsByHour: Array<{
    hour: string;
    requests: number;
    errors: number;
  }>;
}

export interface RequestLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  clientIp: string;
  timestamp: string;
  errorMessage?: string;
  apiKey: {
    keyPrefix: string;
    name: string;
  };
}

export interface PaginatedLogs {
  logs: RequestLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
