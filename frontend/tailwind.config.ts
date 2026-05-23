import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        midnight: "#060816",
        nebula: "#111a38",
        stardust: "#fde68a",
        aurora: "#38bdf8",
        plum: "#8b5cf6",
        ember: "#fb7185"
      },
      fontFamily: {
        display: ['"Avenir Next"', "ui-sans-serif", "system-ui", "sans-serif"],
        body: ['"Trebuchet MS"', '"Segoe UI"', "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 60px rgba(56, 189, 248, 0.18)"
      },
      backgroundImage: {
        cosmic:
          "radial-gradient(circle at top, rgba(56,189,248,0.15), transparent 30%), radial-gradient(circle at 20% 20%, rgba(139,92,246,0.25), transparent 40%), linear-gradient(135deg, #060816 0%, #0b1024 35%, #111a38 100%)"
      }
    }
  },
  plugins: []
};

export default config;
