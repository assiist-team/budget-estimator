/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          900: '#1A252F',
          800: '#2C3E50',
          700: '#34495E',
          600: '#415A77',
        },
        accent: {
          900: '#9A7B4F',
          700: '#B89858',
          600: '#C9A868',
          500: '#D4B878',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

