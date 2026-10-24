import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07090f',
          900: '#0d1117',
          800: '#141a24',
          700: '#1c2431',
          600: '#2a3444',
          500: '#3d4a5e',
          400: '#6b7a90',
          300: '#9aa6b8',
          200: '#c9d1dc',
          100: '#e8ecf1',
        },
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
