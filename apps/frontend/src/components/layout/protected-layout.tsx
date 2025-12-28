'use client';

import { Sidebar } from './sidebar';
import { AuthGuard, AuthLoadingScreen } from '@/components/auth/auth-guard';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

/**
 * ProtectedLayout wraps content that requires authentication.
 * Shows loading state while checking auth, then displays sidebar + content.
 */
export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <AuthGuard fallback={<ProtectedLayoutSkeleton />}>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}

/**
 * Skeleton that matches the protected layout structure
 */
function ProtectedLayoutSkeleton() {
  return (
    <div className="flex h-screen">
      {/* Sidebar skeleton */}
      <div className="w-64 bg-card border-r p-4 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="space-y-2 pt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
      {/* Main content skeleton */}
      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="container mx-auto p-6">
          <AuthLoadingScreen />
        </div>
      </main>
    </div>
  );
}
