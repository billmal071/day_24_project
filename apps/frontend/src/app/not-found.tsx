import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

/**
 * 404 Page (Day 12 - Handle 404 gracefully)
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 p-4">
      <h1 className="text-6xl font-bold">404</h1>
      <h2 className="text-2xl">Page Not Found</h2>
      <p className="text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <Link href="/dashboard">
        <Button>
          <Home className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
