import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        casino: {
          bg: "#0B0813",
          surface: "#14101F",
          purple: "#7C3AED",
          "purple-neon": "#A855F7",
          "purple-glow": "#C084FC",
          gold: "#F5C542",
          "gold-neon": "#FFD700",
          "gold-dim": "#B8860B",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "casino-radial":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124, 58, 237, 0.35), transparent)",
        "gold-shine":
          "linear-gradient(135deg, rgba(245, 197, 66, 0.15) 0%, transparent 50%)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        "neon-purple": "0 0 24px rgba(168, 85, 247, 0.45)",
        "neon-gold": "0 0 20px rgba(255, 215, 0, 0.35)",
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        marquee: "marquee 28s linear infinite",
        "float-subtle": "float-subtle 4s ease-in-out infinite",
        "spin-pulse": "spin-pulse 1.2s ease-in-out infinite",
        "reel-blur": "reel-blur 0.12s linear infinite",
        "win-flash": "win-flash 0.6s ease-in-out infinite",
        "auth-message": "auth-message 0.35s ease-out forwards",
        "confetti-fall": "confetti-fall 2.2s ease-out forwards",
        "coin-fall": "coin-fall 2.4s ease-in forwards",
        "reel-column-blur": "reel-column-blur 0.15s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "float-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "spin-pulse": {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 20px rgba(255,215,0,0.4)" },
          "50%": { transform: "scale(1.03)", boxShadow: "0 0 32px rgba(168,85,247,0.6)" },
        },
        "reel-blur": {
          "0%": { transform: "translateY(-8px)", opacity: "0.7" },
          "100%": { transform: "translateY(8px)", opacity: "1" },
        },
        "win-flash": {
          "0%, 100%": { backgroundColor: "rgba(255, 215, 0, 0.15)" },
          "50%": { backgroundColor: "rgba(168, 85, 247, 0.25)" },
        },
        "auth-message": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "confetti-fall": {
          "0%": { transform: "translateY(-10vh) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(110vh) rotate(720deg)", opacity: "0" },
        },
        "coin-fall": {
          "0%": { transform: "translateY(-20%) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(120vh) rotate(540deg)", opacity: "0" },
        },
        "reel-column-blur": {
          "0%": { transform: "translateY(-4px)", filter: "blur(0px)" },
          "50%": { transform: "translateY(4px)", filter: "blur(1px)" },
          "100%": { transform: "translateY(-4px)", filter: "blur(0px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
