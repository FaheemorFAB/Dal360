/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#020b18",
          panel: "#040f1e",
          border: "#0a2540",
          cyan: "#00d4ff",
          blue: "#0066ff",
          green: "#00ff88",
          red: "#ff2d55",
          orange: "#ff6b35",
          yellow: "#ffd60a",
          purple: "#bf5af2",
        },
      },
      fontFamily: {
        rajdhani: ["Rajdhani", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      animation: {
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-line": "scan-line 3s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "blink": "blink 1.5s step-end infinite",
        "slide-up": "slide-up 0.5s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.3 },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0,212,255,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(0,212,255,0.8), 0 0 40px rgba(0,102,255,0.4)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        blink: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0 },
        },
        "slide-up": {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
