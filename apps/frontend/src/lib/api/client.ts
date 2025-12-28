import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, refreshAccessToken, clearTokens } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; code?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;

    // Handle 401 - try to refresh token
    if (status === 401 && !originalRequest._retry) {
      // Don't retry for auth endpoints - but still provide user-friendly error
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/refresh');

      if (isAuthEndpoint) {
        clearTokens();
        // Extract user-friendly message from response
        const message = error.response?.data?.message || 'Invalid email or password';
        return Promise.reject(new Error(message));
      }

      if (isRefreshing) {
        // Queue this request while we're refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokens = await refreshAccessToken();
        processQueue(null, tokens.accessToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        clearTokens();
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    let message: string;

    switch (status) {
      case 400:
        message =
          error.response?.data?.message || 'Invalid request. Please check your input.';
        break;
      case 401:
        message = 'Authentication required.';
        break;
      case 403:
        message = 'You do not have permission to perform this action.';
        break;
      case 404:
        message = 'The requested resource was not found.';
        break;
      case 409:
        message = error.response?.data?.message || 'Conflict. Resource already exists.';
        break;
      case 429:
        message = 'Too many requests. Please try again later.';
        break;
      case 500:
      case 502:
      case 503:
        message = 'Server error. Please try again later.';
        break;
      default:
        message = error.response?.data?.message || 'Something went wrong. Please try again.';
        break;
    }

    return Promise.reject(new Error(message));
  }
);
