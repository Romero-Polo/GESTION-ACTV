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
          DEFAULT: '#FAA61A', // Naranja principal
          light: '#FBC976',   // Naranja claro
          lighter: '#FDE4BB', // Naranja muy claro
        },
        gray: {
          dark: '#555555',   // Gris oscuro
          medium: '#9a9a9a', // Gris medio
          light: '#dedede',  // Gris claro
        }
      },
      fontFamily: {
        sans: ['Aller', 'Calibri', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'button': '8px', // Esquinas redondeadas para botones
      }
    },
  },
  plugins: [],
}