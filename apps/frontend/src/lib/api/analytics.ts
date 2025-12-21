import { safeFetch, type ApiResponse } from './client';
import type { AnalyticsOverview, PaginatedLogs } from '@/types/api';

export async function getAnalyticsOverview(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<ApiResponse<AnalyticsOverview>> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);

  const query = searchParams.toString();
  return safeFetch<AnalyticsOverview>(`/analytics/overview${query ? `?${query}` : ''}`);
}

export async function getRequestLogs(params?: {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}): Promise<ApiResponse<PaginatedLogs>> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);

  const query = searchParams.toString();
  return safeFetch<PaginatedLogs>(`/analytics/requests${query ? `?${query}` : ''}`);
}
