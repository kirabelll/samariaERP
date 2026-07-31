import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Geist', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Geist Mono', 'ui-monospace', 'monospace'],
        ethio: ['"Noto Sans Ethiopic"', 'var(--font-sans)', 'sans-serif'],
      },
      colors: {
        brand: {
          blue: '#0B6DE5',
          teal: '#14F6BF',
          cyan: '#17BEC4',
        },
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          4: 'var(--surface-4)',
          5: 'var(--surface-5)',
        },
        fg: {
          1: 'var(--fg-1)',
          2: 'var(--fg-2)',
          3: 'var(--fg-3)',
        },
        graphite: {
          950: '#0B0B0D',
          900: '#1D1D1F',
          800: '#2C2C2E',
          700: '#3A3A3C',
          600: '#48484A',
        },
        status: {
          success: '#34C759',
          warning: '#FF9500',
          danger:  '#FF3B30',
          info:    '#0B6DE5',
        },
        accent: {
          50:  '#E5F0FF',
          100: '#CCE1FF',
          300: '#66A8FF',
          500: '#0B6DE5',
          600: '#0055C4',
          700: '#003F95',
        },
        separator: 'var(--border)',
        // Legacy compat
        apple: {
          blue: '#0B6DE5',
          indigo: '#5856D6',
          purple: '#AF52DE',
          pink: '#FF2D55',
          red: '#FF3B30',
          orange: '#FF9500',
          yellow: '#FFCC00',
          green: '#34C759',
          teal: '#5AC8FA',
        },
        label: {
          primary: 'var(--fg-1)',
          secondary: 'var(--fg-2)',
          tertiary: 'var(--fg-3)',
        },
        sidebar: { bg: '#1D1D1F', hover: '#2C2C2E', active: '#3A3A3C', text: '#AEAEB2' },
      },
      fontSize: {
        '2xs':   ['11px', { lineHeight: '14px' }],
        'xs':    ['12px', { lineHeight: '16px' }],
        'sm':    ['13px', { lineHeight: '18px' }],
        'base':  ['15px', { lineHeight: '22px' }],
        'lg':    ['17px', { lineHeight: '24px' }],
        'xl':    ['20px', { lineHeight: '28px' }],
        '2xl':   ['24px', { lineHeight: '32px' }],
        '3xl':   ['28px', { lineHeight: '32px' }],
        '4xl':   ['32px', { lineHeight: '40px' }],
      },
      letterSpacing: {
        tightest: '-0.025em',
        tighter:  '-0.02em',
        tight:    '-0.015em',
        normal:   '-0.01em',
        wide:     '0.06em',
        wider:    '0.10em',
        widest:   '0.15em',
      },
      borderRadius: {
        sm:   '8px',
        md:   '10px',
        lg:   '12px',
        xl:   '16px',
        '2xl':'20px',
        '3xl':'24px',
      },
      boxShadow: {
        'card':       '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
        'card-dark':  'inset 0 0 0 1px rgba(255,255,255,0.04)',
        'glow':       '0 0 0 1px rgba(20,246,191,0.4), 0 0 24px rgba(11,109,229,0.25)',
        'apple-sm':   '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'apple':      '0 2px 8px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.04)',
        'apple-md':   '0 4px 16px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)',
        'apple-lg':   '0 8px 32px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.06)',
        'apple-float':'0 20px 60px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #14F6BF 0%, #17BEC4 50%, #0B6DE5 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
