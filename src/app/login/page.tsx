'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { Eye, EyeOff, Zap } from 'lucide-react';
export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [time, setTime] = useState<Date | null>(null);
  const [sessionId] = useState(() => typeof window !== 'undefined' ? Math.floor(Math.random() * 9000 + 1000) : 1000);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    setMounted(true);
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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
        setError(result.error || 'Invalid credentials');
        setIsLoading(false);
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div
      data-theme="dark"
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        background: 'radial-gradient(ellipse 800px 600px at 20% 30%, rgba(20,246,191,0.12), transparent 60%), radial-gradient(ellipse 600px 500px at 80% 70%, rgba(11,109,229,0.15), transparent 60%), #0B0B0D',
        color: '#F5F5F7',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 48px)',
        pointerEvents: 'none',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
      }} />

      {/* Scanline */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(11,109,229,0.03) 0 1px, transparent 1px 3px)',
      }} />

      {/* Accent beam */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 1, height: '60vh',
        background: 'linear-gradient(180deg, transparent, rgba(11,109,229,0.5), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Top status bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 18,
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.08em', color: '#AEAEB2',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ color: '#F5F5F7' }}>SAMARIA / ERP</span>
        <span>v1.0.0</span>
        <span>&middot;</span>
        <span>NODE AA-01</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: 999,
            background: '#34C759',
            boxShadow: '0 0 8px #34C759',
            animation: 'pulse-dot 2s infinite',
          }} />
          SYSTEMS ONLINE
        </span>
        <span>&middot;</span>
        <span>
          {time ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '--:--:--'} UTC+3
        </span>
      </div>

      {/* Login card */}
      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative', zIndex: 2, width: '100%', maxWidth: 440,
          background: 'rgba(20,20,23,0.75)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '40px 36px',
          boxShadow: '0 0 0 1px rgba(11,109,229,0.15), 0 20px 80px rgba(0,0,0,0.6), 0 0 60px rgba(11,109,229,0.12)',
          animation: 'scale-in 400ms cubic-bezier(.16,1,.3,1)',
        }}
      >
        {/* Corner ticks */}
        {[
          { top: -1, left: -1, borderTop: '1px solid #14F6BF', borderLeft: '1px solid #14F6BF' },
          { top: -1, right: -1, borderTop: '1px solid #14F6BF', borderRight: '1px solid #14F6BF' },
          { bottom: -1, left: -1, borderBottom: '1px solid #0B6DE5', borderLeft: '1px solid #0B6DE5' },
          { bottom: -1, right: -1, borderBottom: '1px solid #0B6DE5', borderRight: '1px solid #0B6DE5' },
        ].map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 14, height: 14, ...s } as any} />
        ))}

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Samaria"
            width={56}
            height={56}
            style={{
              filter: 'drop-shadow(0 0 16px rgba(20,246,191,0.45)) drop-shadow(0 0 24px rgba(11,109,229,0.35))',
            }}
          />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.08em' }}>SAMARIA</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.22em', color: '#AEAEB2', marginTop: 2,
            }}>
              ENTERPRISE &middot; RESOURCE &middot; PLANNING
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(20,246,191,0.5), rgba(11,109,229,0.5), transparent)',
          margin: '0 -36px 28px',
        }} />

        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Authorized access
        </div>
        <div style={{ fontSize: 13, color: '#AEAEB2', marginBottom: 28 }}>
          Internal staff credentials required.
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,59,48,0.1)',
            border: '1px solid rgba(255,59,48,0.3)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 18,
            fontSize: 13, color: '#FF3B30', fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        {/* Username */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#AEAEB2' }}>
              USERNAME
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: '#3A3A3C' }}>
              [01]
            </span>
          </div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            disabled={isLoading}
            required
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 12,
              background: 'rgba(0,0,0,0.4)', color: '#F5F5F7',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500,
              outline: 'none', transition: 'all 200ms',
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = '1px solid #0B6DE5';
              e.currentTarget.style.boxShadow = '0 0 0 4px rgba(11,109,229,0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#AEAEB2' }}>
              PASSWORD
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: '#3A3A3C' }}>
              [02]
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={isLoading}
              required
              style={{
                width: '100%', padding: '14px 48px 14px 16px', borderRadius: 12,
                background: 'rgba(0,0,0,0.4)', color: '#F5F5F7',
                border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500,
                outline: 'none', transition: 'all 200ms', letterSpacing: '0.15em',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid #0B6DE5';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(11,109,229,0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 0, color: '#86868B',
                cursor: 'pointer', padding: 6,
              }}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%', padding: 14, borderRadius: 12, border: 0,
            background: isLoading ? '#0055C4' : 'linear-gradient(135deg, #14F6BF, #17BEC4 45%, #0B6DE5)',
            color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
            letterSpacing: '0.02em',
            cursor: isLoading ? 'wait' : 'pointer',
            boxShadow: '0 0 0 1px rgba(20,246,191,0.4), 0 8px 24px rgba(11,109,229,0.35), 0 0 40px rgba(20,246,191,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 200ms',
          }}
        >
          {isLoading ? 'AUTHENTICATING…' : (
            <>AUTHENTICATE <Zap className="w-4 h-4" /></>
          )}
        </button>

        {/* Footer */}
        <div style={{
          marginTop: 20, display: 'flex', justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
          letterSpacing: '0.1em', color: '#3A3A3C',
        }}>
          <span>ENCRYPTED &middot; TLS 1.3</span>
          <span>SESSION {mounted ? sessionId : '----'}</span>
        </div>
      </form>

      {/* Bottom telemetry */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 24,
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
        letterSpacing: '0.12em', color: '#3A3A3C',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span>CPU &middot; 12%</span>
        <span>MEM &middot; 2.4 / 16 GB</span>
        <span>DB &middot; PGLITE OK</span>
        <span style={{ flex: 1 }} />
        <span>&copy; 2026 &middot; SAMARIA TRADING ONE MEMBER PLC</span>
      </div>
    </div>
  );
}
