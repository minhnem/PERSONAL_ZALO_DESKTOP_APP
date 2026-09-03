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
          DEFAULT: '#0068FF',
          light: '#E5F0FF',
          dark: '#0054cc'
        }
      }
    },
  },
  plugins: [],
}
