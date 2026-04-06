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
          DEFAULT: "#38bdf8",
          mid: "#0ea5e9",
          deep: "#0284c7",
        },
        surface: {
          deep: "#020617",
          DEFAULT: "#0f172a",
          card: "rgba(15, 23, 42, 0.45)",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both',
        'fade-in-scale': 'fadeInScale 0.45s cubic-bezier(0.4, 0, 0.2, 1) both',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'pulse-brand': 'pulse-brand 2.5s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}