import { ProtectedLayout } from '@/components/layout/protected-layout';

export default function ApiKeysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
