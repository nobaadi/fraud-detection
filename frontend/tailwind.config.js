/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#2a2a2a',
          800: '#353535',
          700: '#404040',
          600: '#4a4a4a',
          500: '#585858',
        },
        brand: {
          DEFAULT: '#c9a46c',
          dark:    '#a07c46',
          light:   '#e2c090',
        },
        accent: {
          DEFAULT: '#c9a46c',
          muted:   'rgba(201,164,108,0.12)',
        },
        danger: {
          DEFAULT: '#ef4444',
          dark:    '#dc2626',
          light:   '#fca5a5',
          muted:   'rgba(239,68,68,0.1)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          dark:    '#d97706',
          light:   '#fcd34d',
          muted:   'rgba(245,158,11,0.1)',
        },
        success: {
          DEFAULT: '#10b981',
          dark:    '#059669',
          light:   '#6ee7b7',
          muted:   'rgba(16,185,129,0.08)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
