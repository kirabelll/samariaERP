import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import ToastProvider from '@/components/ui/Toast';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F5F5F7',
};

export const metadata: Metadata = {
  title: 'SAMARIA ERP - Enterprise Resource Planning',
  description: 'Samaria Trading One Member PLC - ERP System',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-64.png', sizes: '64x64', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SAMARIA ERP',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-[var(--surface-2)] text-[var(--fg-1)]">
        <ThemeProvider>
          <SessionProvider>
            <I18nProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </I18nProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
