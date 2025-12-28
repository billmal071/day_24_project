import { apiClient } from './client';
import type { AuthResponse, TokenPair, User } from '@/types/api';

const TOKEN_KEY = 'auth_tokens';
const AUTH_COOKIE = 'auth_tokens';

// Token storage helpers
export function getStoredTokens(): TokenPair | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function storeTokens(tokens: TokenPair): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  // Also set a cookie for middleware detection (7 days expiry)
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  // Clear the cookie
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

export function getAccessToken(): string | null {
  const tokens = getStoredTokens();
  return tokens?.accessToken || null;
}

// API functions
export async function register(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', {
    email,
    password,
  });
  storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', {
    email,
    password,
  });
  storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data;
}

export async function refreshAccessToken(): Promise<TokenPair> {
  const tokens = getStoredTokens();
  if (!tokens?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const { data } = await apiClient.post<TokenPair>('/auth/refresh', {
    refreshToken: tokens.refreshToken,
  });
  storeTokens(data);
  return data;
}

export async function logout(): Promise<void> {
  const tokens = getStoredTokens();
  if (tokens?.refreshToken) {
    try {
      await apiClient.post('/auth/logout', {
        refreshToken: tokens.refreshToken,
        accessToken: tokens.accessToken, // Also send access token for blacklisting
      });
    } catch {
      // Ignore errors - server might already have invalidated the token
    }
  }
  clearTokens();
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}
