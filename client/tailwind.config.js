/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './bouncer.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      colors: {
        midnight: '#0b1021',
        neon: '#6ef3a5',
        slate: '#111827',
      },
      boxShadow: {
        glass: '0 25px 50px -12px rgba(0,0,0,0.45)',
      },
    },
  },
  plugins: [],
}

