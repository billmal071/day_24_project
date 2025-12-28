'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthGuard wraps protected content and handles:
 * 1. Loading state while checking authentication
 * 2. Redirect to login if not authenticated
 * 3. Render children only when authenticated
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return fallback || <AuthLoadingScreen />;
  }

  // Not authenticated - will redirect (show nothing to prevent flash)
  if (!isAuthenticated) {
    return fallback || <AuthLoadingScreen />;
  }

  // Authenticated - render children
  return <>{children}</>;
}

/**
 * Default loading screen for auth checking
 */
export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Page-level loading skeleton for dashboard-like pages
 */
export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-6 bg-muted rounded w-24" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 bg-card rounded-lg border">
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-8 bg-muted rounded w-16" />
              <div className="h-3 bg-muted rounded w-32" />
            </div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="p-6 bg-card rounded-lg border">
        <div className="h-5 bg-muted rounded w-32 mb-4" />
        <div className="h-[300px] bg-muted rounded" />
      </div>
    </div>
  );
}
