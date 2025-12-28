import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ApiKey, CreateApiKeyResponse } from '@/types/api';

// Query keys
export const apiKeyKeys = {
  all: ['apiKeys'] as const,
  detail: (id: string) => ['apiKeys', id] as const,
};

// API functions
async function fetchApiKeys(): Promise<ApiKey[]> {
  const { data } = await apiClient.get<{ keys: ApiKey[] }>('/auth/keys');
  return data.keys;
}

async function fetchApiKey(id: string): Promise<ApiKey> {
  const { data } = await apiClient.get<ApiKey>(`/auth/keys/${id}`);
  return data;
}

async function createApiKey(params: {
  name: string;
  description?: string;
  rateLimit?: number;
}): Promise<CreateApiKeyResponse> {
  const { data } = await apiClient.post<CreateApiKeyResponse>('/auth/keys', params);
  return data;
}

async function revokeApiKey(id: string): Promise<void> {
  await apiClient.delete(`/auth/keys/${id}`);
}

// Hooks
export function useApiKeys() {
  return useQuery({
    queryKey: apiKeyKeys.all,
    queryFn: fetchApiKeys,
  });
}

export function useApiKey(id: string) {
  return useQuery({
    queryKey: apiKeyKeys.detail(id),
    queryFn: () => fetchApiKey(id),
    enabled: !!id,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
    },
  });
}
