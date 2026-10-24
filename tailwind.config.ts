import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Mavzuga bog'liq: CSS o'zgaruvchilar (src/lib/themes.ts). `white` = matn rangi (fg):
        // qorong'i mavzuda oq, yorug' mavzuda to'q — shu tufayli butun UI avtomatik moslashadi.
        white: 'rgb(var(--fg) / <alpha-value>)',
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
        },
        accent: 'rgb(var(--accent) / <alpha-value>)',
        accent2: 'rgb(var(--accent-2) / <alpha-value>)',
        ember: {
          300: '#ffb27a',
          400: '#ff8f4d',
          500: '#ff6a2a',
          600: '#e2501a',
        },
        teal: {
          300: '#6ee7d8',
          400: '#2fd1bc',
          500: '#14b8a6',
          600: '#0f9484',
        },
        gold: {
          300: '#ffe08a',
          400: '#ffcf4d',
          500: '#f5b400',
        },
        rose: {
          400: '#fb6f92',
          500: '#f43f6e',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Sora"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 10px 40px -10px rgba(255,106,42,0.35)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px -15px rgba(0,0,0,0.6)',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(0.92)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-6px)' }, '75%': { transform: 'translateX(6px)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        confetti: { '0%': { transform: 'translateY(0) rotate(0)', opacity: '1' }, '100%': { transform: 'translateY(120vh) rotate(720deg)', opacity: '0' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        pop: 'pop .25s ease-out',
        shake: 'shake .35s ease-in-out',
        float: 'float 3s ease-in-out infinite',
        confetti: 'confetti 2.4s ease-in forwards',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
