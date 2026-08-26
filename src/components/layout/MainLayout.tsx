'use client';

import * as React from 'react';
import Cookies from 'js-cookie';
import { cn } from '@/lib/utils';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const defaultOpen = Cookies.get('sidebar_state') !== 'false';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <div
        id="content"
        className={cn(
          'ml-auto w-full max-w-full',
          'peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]',
          'peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]',
          'sm:transition-[width] sm:duration-200 sm:ease-linear',
          'flex h-svh flex-col min-w-0'
        )}
      >
        <Header />
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

export default MainLayout;
