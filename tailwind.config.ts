import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Console primitives: text-abyss-5, bg-tiaga-0, border-carbon-3, …
        abyss: Object.fromEntries(Array.from({ length: 10 }, (_, step) => [step, `hsl(var(--color-abyss-${step}))`])),
        carbon: Object.fromEntries(Array.from({ length: 10 }, (_, step) => [step, `hsl(var(--color-carbon-${step}))`])),
        marine: Object.fromEntries(Array.from({ length: 10 }, (_, step) => [step, `hsl(var(--color-marine-${step}))`])),
        tiaga: Object.fromEntries(Array.from({ length: 10 }, (_, step) => [step, `hsl(var(--color-tiaga-${step}))`])),
        chaparral: Object.fromEntries(Array.from({ length: 10 }, (_, step) => [step, `hsl(var(--color-chaparral-${step}))`])),
        desert: Object.fromEntries(Array.from({ length: 10 }, (_, step) => [step, `hsl(var(--color-desert-${step}))`])),
        alpine: Object.fromEntries(Array.from({ length: 10 }, (_, step) => [step, `hsl(var(--color-alpine-${step}))`])),
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        surface: "hsl(var(--surface))",
        heading: "hsl(var(--heading))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        tropo: "var(--shadow-tropo)",
        strato: "var(--shadow-strato)",
        meso: "var(--shadow-meso)",
        thermo: "var(--shadow-thermo)",
        soft: "var(--shadow-tropo)",
      },
    },
  },
  plugins: [],
} satisfies Config;
