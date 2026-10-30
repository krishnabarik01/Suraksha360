/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        police: {
          bg: "#090d16",
          card: "#111827",
          border: "#1f2937",
          accent: "#2563eb",
          accentHover: "#1d4ed8",
          gold: "#f59e0b"
        },
        risk: {
          low: "#10b981",       // Safe green / teal
          medium: "#f59e0b",    // Amber yellow
          high: "#f97316",      // Orange
          veryhigh: "#ef4444",  // Red / Crimson
        }
      }
    },
  },
  plugins: [],
}
