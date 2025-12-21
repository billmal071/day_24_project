import { safeFetch, type ApiResponse } from './client';
import type { ApiKey, CreateApiKeyResponse } from '@/types/api';

export async function getApiKeys(): Promise<ApiResponse<{ keys: ApiKey[] }>> {
  return safeFetch<{ keys: ApiKey[] }>('/auth/keys');
}

export async function getApiKey(id: string): Promise<ApiResponse<ApiKey>> {
  return safeFetch<ApiKey>(`/auth/keys/${id}`);
}

export async function createApiKey(data: {
  name: string;
  description?: string;
  rateLimit?: number;
}): Promise<ApiResponse<CreateApiKeyResponse>> {
  return safeFetch<CreateApiKeyResponse>('/auth/keys', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function revokeApiKey(id: string): Promise<ApiResponse<void>> {
  return safeFetch<void>(`/auth/keys/${id}`, {
    method: 'DELETE',
  });
}
