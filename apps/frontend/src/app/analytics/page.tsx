'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRequestLogs } from '@/lib/api/analytics';
import type { RequestLog } from '@/types/api';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AnalyticsPage() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  async function fetchLogs() {
    setLoading(true);
    const result = await getRequestLogs({ limit: 50 });
    if (result.success) {
      setLogs(result.data.logs);
      setTotal(result.data.pagination.total);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  function getStatusColor(status: number) {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'secondary';
    if (status >= 500) return 'destructive';
    return 'outline';
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Request Logs</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Request Logs</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Request Logs</h1>
          <p className="text-muted-foreground">{total} total requests</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No requests logged yet. Make some API requests to see logs here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Time</th>
                    <th className="text-left py-3 px-2">Method</th>
                    <th className="text-left py-3 px-2">Path</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Latency</th>
                    <th className="text-left py-3 px-2">API Key</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">{log.method}</Badge>
                      </td>
                      <td className="py-3 px-2 font-mono text-xs max-w-[200px] truncate">
                        {log.path}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={getStatusColor(log.statusCode)}>
                          {log.statusCode}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">{log.responseTime}ms</td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {log.apiKey.keyPrefix}***
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
