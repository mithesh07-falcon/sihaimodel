/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#030712',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        red: {
          500: '#ef4444',
          600: '#dc2626',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'piston-1': 'piston 0.6s ease-in-out infinite alternate',
        'piston-2': 'piston-delayed 0.6s ease-in-out infinite alternate',
        'flow-fast': 'flow 1s linear infinite',
        'flow-medium': 'flow 2s linear infinite',
      },
      keyframes: {
        piston: {
          '0%': { transform: 'translateY(0px)' },
          '100%': { transform: 'translateY(15px)' }
        },
        'piston-delayed': {
          '0%': { transform: 'translateY(15px)' },
          '100%': { transform: 'translateY(0px)' }
        },
        flow: {
          '0%': { strokeDashoffset: '20' },
          '100%': { strokeDashoffset: '0' }
        }
      }
    },
  },
  plugins: [],
}
