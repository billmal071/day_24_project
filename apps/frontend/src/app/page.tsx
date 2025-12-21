import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, BarChart3, Shield, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-4">
            Developer API Gateway
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage your API keys, monitor usage, and protect your endpoints with
            rate limiting and caching.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg">Go to Dashboard</Button>
            </Link>
            <Link href="/api-keys">
              <Button size="lg" variant="outline">
                Manage API Keys
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <Card>
            <CardHeader>
              <Key className="h-10 w-10 text-primary mb-2" />
              <CardTitle>API Key Management</CardTitle>
              <CardDescription>
                Generate and manage API keys for your applications
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Rate Limiting</CardTitle>
              <CardDescription>
                Protect your API with Redis-backed rate limiting (10 req/min)
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Response Caching</CardTitle>
              <CardDescription>
                Speed up responses with intelligent Redis caching
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>
                Monitor API usage with real-time analytics and logs
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
