import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { AnalyticsOverview, PaginatedLogs } from '@/types/api';

// Query keys
export const analyticsKeys = {
  overview: (params?: { startDate?: string; endDate?: string }) =>
    ['analytics', 'overview', params] as const,
  logs: (params?: { limit?: number; offset?: number; startDate?: string; endDate?: string }) =>
    ['analytics', 'logs', params] as const,
};

// API functions
async function fetchAnalyticsOverview(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsOverview> {
  const { data } = await apiClient.get<AnalyticsOverview>('/analytics/overview', {
    params,
  });
  return data;
}

async function fetchRequestLogs(params?: {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedLogs> {
  const { data } = await apiClient.get<PaginatedLogs>('/analytics/requests', {
    params,
  });
  return data;
}

// Hooks
export function useAnalyticsOverview(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: analyticsKeys.overview(params),
    queryFn: () => fetchAnalyticsOverview(params),
  });
}

export function useRequestLogs(params?: {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: analyticsKeys.logs(params),
    queryFn: () => fetchRequestLogs(params),
  });
}
