'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  Settings,
  LogOut,
  User,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

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
  const pageTitle = breadcrumbs.length > 0
    ? breadcrumbs[breadcrumbs.length - 1].label
    : 'Dashboard';

  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <header
      className="sticky top-0 z-20"
      style={{
        background: isDark ? 'rgba(21,21,24,0.72)' : 'rgba(255,255,255,0.72)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: `1px solid var(--border)`,
        boxShadow: 'inset 0 2px 0 0 rgba(20,246,191,0.6), inset 0 3px 0 0 rgba(11,109,229,0.4)',
      }}
    >
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 h-[56px] md:h-[60px]">
        {/* Left: Menu + Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-[10px] transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{
              color: 'var(--fg-1)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'var(--surface-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile title */}
          <h1 className="md:hidden text-base font-semibold truncate" style={{ color: 'var(--fg-1)' }}>
            {pageTitle}
          </h1>

          {/* Desktop Breadcrumbs */}
          <nav className="hidden md:block min-w-0">
            <ol className="flex items-center gap-2 text-[13px]">
              <li>
                <a href="/dashboard" className="transition-colors duration-200" style={{ color: 'var(--fg-2)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--fg-1)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--fg-2)'}
                >
                  Dashboard
                </a>
              </li>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  <li style={{ color: 'var(--fg-3)' }}>/</li>
                  <li className="truncate">
                    {index === breadcrumbs.length - 1 ? (
                      <span className="font-medium" style={{ color: 'var(--fg-1)' }}>{crumb.label}</span>
                    ) : (
                      <a href={crumb.path} className="transition-colors duration-200" style={{ color: 'var(--fg-2)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--fg-1)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--fg-2)'}
                      >
                        {crumb.label}
                      </a>
                    )}
                  </li>
                </React.Fragment>
              ))}
            </ol>
          </nav>
        </div>

        {/* Right: Search, Theme Toggle, Notifications, Profile */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
          {/* Search */}
          <div className="hidden sm:block relative">
            <input
              type="text"
              placeholder="Search…"
              className="px-3 py-2 pl-9 rounded-[10px] border-0 text-[13px] outline-none w-36 md:w-[200px] transition-all duration-200"
              style={{
                background: isDark ? 'var(--surface-3)' : 'var(--surface-2)',
                color: 'var(--fg-1)',
              }}
            />
            <Search className="w-[14px] h-[14px] absolute left-[10px] top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-3)' }} />
          </div>

          {/* CMD / LITE Toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Switch to light mode' : 'Enter Command Mode'}
            className="flex items-center gap-[6px] px-[10px] py-[6px] rounded-[10px] transition-all duration-200"
            style={{
              border: `1px solid var(--border)`,
              background: isDark
                ? 'linear-gradient(135deg, rgba(20,246,191,0.12), rgba(11,109,229,0.18))'
                : 'var(--surface-2)',
              color: 'var(--fg-1)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
            }}
          >
            <span
              className="w-[6px] h-[6px] rounded-full"
              style={{
                background: isDark ? '#14F6BF' : '#86868B',
                boxShadow: isDark ? '0 0 8px #14F6BF' : 'none',
              }}
            />
            {isDark ? 'CMD' : 'LITE'}
          </button>

          {/* Language Toggle - compact */}
          <div className="hidden sm:flex gap-[2px] rounded-lg p-[2px]" style={{ background: isDark ? 'var(--surface-3)' : 'var(--surface-2)' }}>
            <button
              onClick={() => setLocale('en')}
              className="px-2 py-1 rounded-md text-xs font-medium transition-all duration-200"
              style={{
                background: locale === 'en' ? (isDark ? 'var(--surface-4)' : '#fff') : 'transparent',
                color: locale === 'en' ? '#0B6DE5' : 'var(--fg-2)',
                boxShadow: locale === 'en' && !isDark ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLocale('am')}
              className="px-2 py-1 rounded-md text-xs font-medium transition-all duration-200"
              style={{
                background: locale === 'am' ? (isDark ? 'var(--surface-4)' : '#fff') : 'transparent',
                color: locale === 'am' ? '#0B6DE5' : 'var(--fg-2)',
                boxShadow: locale === 'am' && !isDark ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              አማ
            </button>
          </div>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-[10px] transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--fg-1)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'var(--surface-2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-[6px] h-[6px] bg-[#FF3B30] rounded-full" />
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-[10px] px-[10px] py-[6px] rounded-[10px] transition-all duration-200 min-h-[44px]"
              style={{ background: isDark ? 'var(--surface-3)' : 'var(--surface-2)' }}
            >
              {/* Avatar with brand gradient */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #14F6BF, #0B6DE5)',
                }}
              >
                {userInitial}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-[12px] font-medium truncate max-w-[120px]" style={{ color: 'var(--fg-1)' }}>
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--fg-2)' }}>
                  {(session?.user as any)?.role || 'Staff'}
                </p>
              </div>
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                <div
                  className="absolute right-0 mt-2 w-48 rounded-2xl py-1 z-50"
                  style={{
                    background: 'var(--surface-0)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-float)',
                  }}
                >
                  <button
                    onClick={() => { router.push('/dashboard/profile'); setIsProfileOpen(false); }}
                    className="w-full flex items-center gap-3 mx-1 px-3 py-2.5 text-sm rounded-xl transition-all duration-200"
                    style={{ color: 'var(--fg-1)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => { router.push('/dashboard/system/settings'); setIsProfileOpen(false); }}
                    className="w-full flex items-center gap-3 mx-1 px-3 py-2.5 text-sm rounded-xl transition-all duration-200"
                    style={{ color: 'var(--fg-1)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <hr style={{ borderColor: 'var(--border)', margin: '4px 0' }} />
                  <button
                    onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
                    className="w-full flex items-center gap-3 mx-1 px-3 py-2.5 text-sm text-[#FF453A] rounded-xl transition-all duration-200"
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
