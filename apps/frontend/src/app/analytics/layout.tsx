import { Sidebar } from '@/components/layout/sidebar';

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
