/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sonic-blue': '#0066ff',
        'sonic-green': '#00ff88',
        'sonic-purple': '#6366f1',
        'game-bg': '#1a1a2e',
        'game-secondary': '#16213e',
        'game-accent': '#0f3460',
      },
      fontFamily: {
        'game': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      backgroundImage: {
        'gradient-game': 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'game': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'game-hover': '0 12px 40px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}