/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nordic: {
          50: "#f3f7fa",
          100: "#e2ecf3",
          500: "#365b80",
          700: "#1f3a55",
          900: "#0c1c2c",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
