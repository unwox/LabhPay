import type { Config } from "tailwindcss";

/**
 * LabhPay design tokens.
 *
 * Aesthetic: Apple Wallet stacked-card calm meets Zara serif restraint.
 * Surface = ivory paper. Ink = near-black. One emerald accent. One warm gold.
 * Generous spacing. Shadows are *soft*, never crisp.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#15151B",
          soft: "#2A2A33",
          muted: "#76767F",
          faint: "#B8B8BE",
        },
        paper: {
          DEFAULT: "#FAF8F4",     // ivory page
          warm: "#F3EFE7",        // a touch warmer for callouts
          card: "#FFFFFF",
          ink: "#0B0B10",         // for dark sections
        },
        accent: {
          DEFAULT: "#0E5C49",     // deep emerald — trust + wealth
          ink: "#082E26",
          soft: "#E6F1ED",
          mist: "#F1F7F4",
        },
        gold: {
          DEFAULT: "#B8865A",     // restrained luxury accent
          soft: "#F5EBDD",
        },
      },
      fontFamily: {
        // Loaded via next/font in layout.tsx and exposed as CSS variables.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "Helvetica", "Arial"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo"],
      },
      fontSize: {
        // Tighter tracking on display sizes.
        "display-sm": ["2.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-md": ["3.5rem", { lineHeight: "1.02", letterSpacing: "-0.025em" }],
        "display-lg": ["5rem",   { lineHeight: "0.98", letterSpacing: "-0.03em"  }],
        "display-xl": ["6.5rem", { lineHeight: "0.95", letterSpacing: "-0.035em" }],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        // Soft, layered — never harsh.
        "card-sm": "0 1px 2px rgba(20,20,30,0.04), 0 4px 12px rgba(20,20,30,0.04)",
        "card":    "0 2px 4px rgba(20,20,30,0.04), 0 12px 32px rgba(20,20,30,0.06)",
        "card-lg": "0 4px 8px rgba(20,20,30,0.04), 0 24px 60px rgba(20,20,30,0.08)",
        "card-xl": "0 8px 16px rgba(20,20,30,0.05), 0 48px 120px rgba(20,20,30,0.10)",
        "inset-hair": "inset 0 0 0 1px rgba(20,20,30,0.06)",
      },
      backgroundImage: {
        "ivory-fade":
          "radial-gradient(80% 60% at 50% 0%, #FFFFFF 0%, #FAF8F4 55%, #F3EFE7 100%)",
        "emerald-mist":
          "linear-gradient(180deg, rgba(14,92,73,0.06) 0%, rgba(14,92,73,0.00) 60%)",
        "card-sheen":
          "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.0) 40%)",
      },
      keyframes: {
        "fade-rise": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float-slow": {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(-6px)" },
        },
        indeterminate: {
          "0%":   { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(420%)" },
        },
      },
      animation: {
        "fade-rise": "fade-rise 600ms cubic-bezier(.2,.8,.2,1) both",
        "float-slow": "float-slow 6s ease-in-out infinite",
        indeterminate: "indeterminate 1.1s ease-in-out infinite",
      },
      maxWidth: {
        prose: "68ch",
        site: "1200px",
      },
      letterSpacing: {
        eyebrow: "0.22em",
      },
    },
  },
  plugins: [],
};

export default config;
