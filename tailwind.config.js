/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        nordic: {
          bg: "#F4F6F8",
          surface: "#FFFFFF",
          ink: "#1B2A33",
          muted: "#5B6E78",
          line: "#E3E8EC",
          fjord: "#3C6E91",
          fjordDark: "#274B66",
          ice: "#A6CFE2",
          moss: "#6FA683",
          aurora: "#7BB7A4",
          ember: "#D88B6A",
          sun: "#E3B341",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(27, 42, 51, 0.04), 0 8px 24px rgba(27, 42, 51, 0.06)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
