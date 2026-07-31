import { MainLayout } from '@/components/layout/MainLayout';
import { ReactNode } from 'react';

// Force all dashboard pages to be dynamic (server-rendered at request time)
// because they rely on I18nProvider context and session state
export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
