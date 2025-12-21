'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAnalyticsOverview } from '@/lib/api/analytics';
import type { AnalyticsOverview } from '@/types/api';
import { Activity, AlertTriangle, Clock, Key } from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await getAnalyticsOverview();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Make sure the backend is running and Redis/PostgreSQL are connected.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Badge variant="outline">Last 24 hours</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalRequests.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.successfulRequests.toLocaleString() || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.errorRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.failedRequests || 0} failed requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgResponseTime || 0}ms</div>
            <p className="text-xs text-muted-foreground">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeKeys || 0}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requests Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.requestsByHour && data.requestsByHour.length > 0 ? (
            <div className="h-[300px] flex items-end gap-1">
              {data.requestsByHour.map((item, index) => {
                const maxRequests = Math.max(
                  ...data.requestsByHour.map((h) => h.requests),
                );
                const height =
                  maxRequests > 0 ? (item.requests / maxRequests) * 100 : 0;
                return (
                  <div
                    key={index}
                    className="flex-1 bg-primary rounded-t"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${item.hour}: ${item.requests} requests`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available yet. Start making API requests to see analytics.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
