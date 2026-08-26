'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Sun,
  Moon,
  Globe,
  Check,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { CommandMenu } from '@/components/ui/CommandMenu';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isLangOpen, setIsLangOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  const profileRef = React.useRef<HTMLDivElement>(null);
  const langRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbs = () => {
    const segments = pathname
      .split('/')
      .filter((s) => s && s !== 'dashboard')
      .slice(0, 3);

    return segments.map((segment, index) => ({
      label: segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      path: `/dashboard/${segments.slice(0, index + 1).join('/')}`,
    }));
  };

  const breadcrumbs = getBreadcrumbs();
  const pageTitle =
    breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : 'Dashboard';

  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || 'U';
  const userRole = (session?.user as any)?.role || 'USER';

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 md:px-6 backdrop-blur-md transition-colors font-sans">
        {/* Left: Menu Trigger + Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger />

          <Separator orientation="vertical" className="h-4 hidden sm:block" />

          {/* Mobile title */}
          <h1 className="md:hidden text-sm font-semibold truncate text-foreground">
            {pageTitle}
          </h1>

          {/* Desktop Breadcrumbs */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors font-medium"
            >
              Dashboard
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.path}>
                <span className="text-muted-foreground/50">/</span>
                {idx === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-foreground truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.path}
                    className="hover:text-foreground transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="relative hidden sm:flex h-8 w-48 md:w-60 items-center justify-between rounded-md border border-input bg-muted/40 px-2.5 text-xs text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Search ERP...</span>
            </div>
            <kbd className="pointer-events-none flex h-4 items-center gap-0.5 rounded border border-border bg-background px-1 font-mono text-[10px] font-medium opacity-100">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
            className="sm:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Language Selector */}
          <div className="relative" ref={langRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="h-8 gap-1 px-2 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{locale}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>

            {isLangOpen && (
              <div className="absolute right-0 mt-1.5 w-36 rounded-lg border border-border bg-card p-1 shadow-lg animate-in fade-in-0 zoom-in-95 z-50">
                <button
                  onClick={() => {
                    setLocale('en');
                    setIsLangOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors text-left cursor-pointer',
                    locale === 'en'
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  <span>English</span>
                  {locale === 'en' && <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setLocale('am');
                    setIsLangOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors text-left cursor-pointer',
                    locale === 'am'
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  <span>አማርኛ</span>
                  {locale === 'am' && <Check className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Theme Switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </Button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 rounded-full p-0.5 ring-offset-background transition-all hover:ring-2 hover:ring-ring/40 cursor-pointer"
            >
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs shadow-xs">
                {userInitial}
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 z-50 divide-y divide-border/40">
                <div className="px-2.5 py-2">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">
                    {session?.user?.name || 'Administrator'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {session?.user?.email || 'admin@samaria.com'}
                  </p>
                  <span className="inline-block mt-1.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {userRole}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md hover:bg-muted text-foreground transition-colors"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Profile & Account</span>
                  </Link>
                  <Link
                    href="/dashboard/users"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md hover:bg-muted text-foreground transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>System Settings</span>
                  </Link>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => signOut({ callbackUrl: '/login', redirect: true })}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs rounded-md hover:bg-destructive/10 text-destructive font-medium transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Search Modal */}
      <CommandMenu
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}

export default Header;
