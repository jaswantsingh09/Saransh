import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Consistent color palette
        primary: "hsl(221, 83%, 53%)", // blue-600
        secondary: "hsl(210, 40%, 96%)", // gray-50
        accent: "hsl(221, 83%, 53%)", // blue-600
        destructive: "hsl(0, 84%, 60%)", // red-500

        // ── Redesign token namespace (isolated; does not touch keys above) ──
        // Source of truth: Figma variables (file gFLPWa1todMUetoxrVmsdj).
        // Note: the Figma orange ramp (50/100/200/300/700/800) matches
        // Tailwind's DEFAULT `orange-*`, so no override is needed there.
        brand: {
          DEFAULT: "#c2410c",
          dark: "#bb4d00",
          accent: "#d35238",
          "accent-mid": "#c15c3d",
          "accent-dark": "#a2492e",
          subtle: "#fff7ed",
        },
        surface: {
          app: "#fafaf9",
          warm: "#faf6f1",
          muted: "#f5f5f4",
          card: "#ffffff",
          accent: "#ffedd5",
          "accent-subtle": "#fff7ed",
          "accent-lightest": "#fff2eb",
          overlay: "#e1dddd",
          inverted: "#000000",
        },
        ink: {
          primary: "#020617",
          heading: "#0f172a",
          secondary: "#262626",
          body: "#334155",
          muted: "#737373",
          subtle: "#52525b",
          tertiary: "#64748b",
          brand: "#c2410c",
          link: "#2563eb",
          "on-primary": "#ffffff",
          error: "#dc2626",
          success: "#15803d",
        },
        edge: {
          DEFAULT: "#e2e8f0",
          warm: "#ead4c9",
          "warm-light": "#eadcc9",
          muted: "#d4d4d8",
          strong: "#cbd5e1",
          brand: "#bb4d00",
          accent: "#ffedd5",
          subtle: "#94a3b8",
          focus: "#3b82f6",
        },
        status: {
          error: "#dc2626",
          warning: "#fbbf24",
          success: "#16a34a",
        },
        traffic: {
          close: "#ff6154",
          minimize: "#ffbd36",
          maximize: "#29c742",
        },
      },
      fontFamily: {
        // Inter is wired via next/font in the (redesign) layout.
        "rd-sans": ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        'display': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'h1': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'h2': ['18px', { lineHeight: '1.4', fontWeight: '500' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'small': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],

        // ── Redesign type scale (Inter) ──
        'rd-h2': ['30px', { lineHeight: '30px', letterSpacing: '-1px', fontWeight: '600' }],
        'rd-h3': ['24px', { lineHeight: '28.8px', letterSpacing: '-1px', fontWeight: '600' }],
        'rd-h4': ['20px', { lineHeight: '24px', fontWeight: '600' }],
        'rd-body': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'rd-small': ['14px', { lineHeight: '21px', letterSpacing: '0.5px', fontWeight: '400' }],
        'rd-mini': ['12px', { lineHeight: '16px', letterSpacing: '1.5px', fontWeight: '400' }],
      },
      borderRadius: {
        'rd-sm': '4px',
        'rd-md': '6px',
        'rd-lg': '8px',
        'rd-xl': '12px',
        'rd-2xl': '16px',
      },
      boxShadow: {
        'rd-xs': '0 1px 2px 0 rgba(0,0,0,0.05)',
        'rd-sm': '0 1px 2px -1px rgba(0,0,0,0.1), 0 1px 3px 0 rgba(0,0,0,0.1)',
        'rd-md': '0 2px 4px -2px rgba(0,0,0,0.1), 0 4px 6px -1px rgba(0,0,0,0.1)',
        'rd-lg': '0 4px 6px -4px rgba(0,0,0,0.1), 0 10px 15px -3px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} satisfies Config;
