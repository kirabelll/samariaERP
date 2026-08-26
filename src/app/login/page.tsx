'use client';

import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Eye,
  EyeOff,
  Building2,
  Lock,
  User,
  ArrowRight,
  Globe,
  Sun,
  Moon,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';

export default function LoginPage() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLangOpen, setIsLangOpen] = React.useState(false);

  const router = useRouter();
  const { locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || 'Invalid username or password');
        setIsLoading(false);
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during authentication.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-svh w-full flex items-center justify-center bg-background text-foreground font-sans p-4 sm:p-8 selection:bg-primary selection:text-primary-foreground">
      {/* Top right quick settings */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {/* Language selector */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="h-8 gap-1 px-2.5 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{locale}</span>
          </Button>

          {isLangOpen && (
            <div className="absolute right-0 mt-1.5 w-32 rounded-lg border border-border bg-card p-1 shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
              <button
                type="button"
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
                type="button"
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
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700" />
          )}
        </Button>
      </div>

      {/* Centered Auth Layout (matches frontend SignIn) */}
      <div className="mx-auto flex w-full flex-col justify-center space-y-4 sm:w-[420px]">
        {/* Brand Header */}
        <div className="mb-2 flex items-center justify-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
            <Building2 className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SAMARIA ERP</h1>
        </div>

        {/* Centered Auth Card */}
        <Card className="border border-border shadow-lg bg-card">
          <CardHeader className="space-y-1 pb-4 text-left">
            <CardTitle className="text-xl font-bold tracking-tight">Login</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your username and password below to log into your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive animate-in fade-in-0">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Username
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-muted-foreground pointer-events-none">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    disabled={isLoading}
                    required
                    autoComplete="username"
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 text-foreground"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Password
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    TLS 1.3
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-muted-foreground pointer-events-none">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    required
                    autoComplete="current-password"
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 text-foreground font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-12 font-semibold shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-0">
            <p className="text-center text-[11px] text-muted-foreground w-full">
              Protected by Samaria Trading Security Access Policy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
