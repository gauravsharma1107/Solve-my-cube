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
        cube: {
          white: '#FFFFFF',
          yellow: '#FFD500',
          green: '#009B48',
          blue: '#0046AD',
          red: '#B71234',
          orange: '#FF5800',
          dark: '#0f172a',
          darker: '#090d16',
          panel: '#1e293b',
          border: '#334155',
          accent: '#38bdf8',
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(56, 189, 248, 0.45)',
        'neon-green': '0 0 15px rgba(34, 197, 94, 0.45)',
        'neon-amber': '0 0 15px rgba(245, 158, 11, 0.45)',
        'neon-red': '0 0 15px rgba(239, 68, 68, 0.45)',
        'glow': '0 0 25px -5px rgba(56, 189, 248, 0.3)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
