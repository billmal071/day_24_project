/**
 * Safe Fetch Pattern (Day 12 - Reliability)
 * Gracefully handles 404 and 500 errors
 */

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function safeFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}/api/v1${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    // Handle specific error status codes (Day 12 - Error Handling)
    if (!response.ok) {
      return handleErrorResponse(response);
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return { success: true, data: null as T };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    // Network errors, JSON parsing errors, etc.
    return {
      success: false,
      error: {
        status: 0,
        message:
          error instanceof Error ? error.message : 'An unexpected error occurred',
        code: 'NETWORK_ERROR',
      },
    };
  }
}

async function handleErrorResponse(
  response: Response,
): Promise<ApiResponse<never>> {
  let message = 'An error occurred';
  let code: string | undefined;

  try {
    const errorBody = await response.json();
    message = errorBody.message || errorBody.error || message;
    code = errorBody.code;
  } catch {
    // Response body is not JSON
    message = response.statusText || message;
  }

  // Specific error handling (Day 12 - Handle 404 and 500 gracefully)
  switch (response.status) {
    case 400:
      message = message || 'Invalid request';
      code = code || 'BAD_REQUEST';
      break;
    case 401:
      message = 'Please provide a valid API key';
      code = 'UNAUTHORIZED';
      break;
    case 403:
      message = 'You do not have permission to perform this action';
      code = 'FORBIDDEN';
      break;
    case 404:
      message = 'The requested resource was not found';
      code = 'NOT_FOUND';
      break;
    case 429:
      message = 'Too many requests. Please try again later';
      code = 'RATE_LIMITED';
      break;
    case 500:
    case 502:
    case 503:
      message = 'Server error. Please try again later';
      code = 'SERVER_ERROR';
      break;
  }

  return {
    success: false,
    error: { status: response.status, message, code },
  };
}

/**
 * Authenticated fetch helper
 */
export async function authFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  return safeFetch<T>(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
