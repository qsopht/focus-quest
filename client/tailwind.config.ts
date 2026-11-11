import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Nunito'", "'Segoe UI'", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f1f0ff",
          100: "#e3e0ff",
          200: "#c9c3ff",
          300: "#a79bff",
          400: "#8b7bff",
          500: "#7257ff",
          600: "#5f3fee",
          700: "#4f31c9",
          800: "#412aa0",
          900: "#372680",
        },
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "float-up": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-24px)", opacity: "0" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.2s ease-out",
        "float-up": "float-up 1.1s ease-out forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
