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
        ivory: "#f7f1e3",
        sage: "#52624f",
        gold: "#c89b3c",
        ember: "#b85c38"
      },
      fontFamily: {
        display: ['"Georgia"', '"Times New Roman"', "serif"],
        body: ['"Trebuchet MS"', '"Segoe UI"', "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 24px 80px rgba(82, 98, 79, 0.12)"
      },
      backgroundImage: {
        spiritual:
          "radial-gradient(circle at top, rgba(200,155,60,0.16), transparent 28%), radial-gradient(circle at 15% 20%, rgba(82,98,79,0.1), transparent 32%), linear-gradient(145deg, #fcf8ef 0%, #f7f1e3 52%, #efe6d1 100%)"
      }
    }
  },
  plugins: []
};

export default config;
