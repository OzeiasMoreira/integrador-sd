/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0066ff',
          yellow: '#ffff00',
        },
        neon: {
          red: '#ff2a2a',
          orange: '#ff7b00',
          green: '#00ff88',
          cyan: '#00e5ff',
          blue: '#00f2ff',
          yellow: '#f4ff00'
        },
        dark: {
          900: '#0a0a0a',
          800: '#171717',
          700: '#262626',
        }
      },
      fontFamily: {
        oswald: ['Oswald', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
