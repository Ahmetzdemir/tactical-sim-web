/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mil: {
          bg: '#0a0f0a',
          panel: '#111a11',
          border: '#1e2e1e',
          text: '#a3bfa3',
          textBright: '#d1e8d1',
          green: '#22c55e',
          greenDim: '#166534',
          khaki: '#4a5d23',
          khakiLight: '#657a33',
          red: '#ef4444',
          yellow: '#eab308',
          cyan: '#06b6d4',
          cyanDim: '#164e63',
          dim: '#4b5563',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace', 'Courier New'],
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
