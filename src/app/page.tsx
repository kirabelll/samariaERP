'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (session) {
      // User is authenticated, redirect to dashboard
      router.replace('/dashboard');
    } else {
      // User is not authenticated, redirect to login
      router.replace('/login');
    }
  }, [session, status, router]);


  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0B0B0D',
      color: '#F5F5F7',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Samaria"
          width={64}
          height={64}
          style={{
            filter: 'drop-shadow(0 0 16px rgba(20,246,191,0.45)) drop-shadow(0 0 24px rgba(11,109,229,0.35))',
          }}
        />
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.12em',
          color: '#AEAEB2',
          textTransform: 'uppercase',
        }}>
          Loading Samaria ERP...
        </div>
      </div>
    </div>
  );
}