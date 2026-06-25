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
        ivory: "#f5f0e8",       /* logo background cream */
        sage:  "#5a1e0a",       /* dark brown — primary text/buttons */
        gold:  "#8b1a1a",       /* deep red — accent (the Z color) */
        ember: "#c0392b"        /* bright red — errors/highlights */
      },
      fontFamily: {
        display: ['"Georgia"', '"Times New Roman"', "serif"],
        body: ['"Trebuchet MS"', '"Segoe UI"', "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 24px 80px rgba(90, 30, 10, 0.10)"
      },
      backgroundImage: {
        spiritual:
          "radial-gradient(circle at top, rgba(139,26,26,0.10), transparent 28%), radial-gradient(circle at 15% 20%, rgba(90,30,10,0.08), transparent 32%), linear-gradient(145deg, #f5f0e8 0%, #f0ebe0 52%, #e8e0d0 100%)"
      }
    }
  },
  plugins: []
};

export default config;
