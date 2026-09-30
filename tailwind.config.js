/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        yaru: {
          orange: '#E95420',
          aubergine: '#77216F',
          darkAubergine: '#5E2750',
          midAubergine: '#2C001E',
          warmGrey: '#AEA79F',
          coolGrey: '#333333',
          darkBg: '#1E1E2E',
          cardBg: '#282738',
          cardHover: '#353448',
          cardBorder: 'rgba(255, 255, 255, 0.08)',
          cardSelected: '#3E3C54',
          textMuted: '#9E9DA8',
        }
      },
      fontFamily: {
        ubuntu: ['Ubuntu', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Ubuntu Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'card-glow': '0 0 15px rgba(233, 84, 32, 0.25)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
} 
