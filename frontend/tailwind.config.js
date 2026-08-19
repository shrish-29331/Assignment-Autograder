/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#182420",
          50: "#eef1ef",
          100: "#d3dbd7",
          200: "#a6b7af",
          300: "#799387",
          400: "#3f5a4e",
          500: "#243830",
          600: "#182420",
          700: "#101a17",
          800: "#0b120f",
          900: "#060a08",
        },
        paper: {
          DEFAULT: "#F3F4EE",
          dim: "#E8E9E1",
        },
        marigold: {
          DEFAULT: "#D8A73D",
          light: "#EFC873",
          dark: "#A9791F",
        },
        pass: "#3F7D5C",
        fail: "#B5563C",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        sans: ["'Public Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11, 18, 15, 0.06), 0 8px 24px -12px rgba(11, 18, 15, 0.15)",
      },
    },
  },
  plugins: [],
};
