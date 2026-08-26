/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'var(--font-source-sans-3)'
  			],
  			'rd-sans': ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif']
  		},
  		fontSize: {
  			'rd-h2': ['30px', { lineHeight: '30px', letterSpacing: '-1px', fontWeight: '600' }],
  			'rd-h3': ['24px', { lineHeight: '28.8px', letterSpacing: '-1px', fontWeight: '600' }],
  			'rd-h4': ['20px', { lineHeight: '24px', fontWeight: '600' }],
  			'rd-body': ['16px', { lineHeight: '24px', fontWeight: '400' }],
  			'rd-small': ['14px', { lineHeight: '21px', letterSpacing: '0.5px', fontWeight: '400' }],
  			'rd-mini': ['12px', { lineHeight: '16px', letterSpacing: '1.5px', fontWeight: '400' }]
  		},
  		boxShadow: {
  			'rd-xs': '0 1px 2px 0 rgba(0,0,0,0.05)',
  			'rd-sm': '0 1px 2px -1px rgba(0,0,0,0.1), 0 1px 3px 0 rgba(0,0,0,0.1)',
  			'rd-md': '0 2px 4px -2px rgba(0,0,0,0.1), 0 4px 6px -1px rgba(0,0,0,0.1)',
  			'rd-lg': '0 4px 6px -4px rgba(0,0,0,0.1), 0 10px 15px -3px rgba(0,0,0,0.1)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			tertiary: '#64748b',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			// ── Redesign token namespace (Figma file gFLPWa1todMUetoxrVmsdj) ──
  			// Additive; does not touch the shadcn keys above. Ported here from
  			// tailwind.config.ts because Tailwind resolves .js first, so the .ts
  			// extension never compiled. Keys match real class usage in (redesign).
  			brand: {
  				DEFAULT: '#c2410c',
  				dark: '#bb4d00',
  				accent: '#d35238',
  				'accent-mid': '#c15c3d',
  				'accent-dark': '#a2492e',
  				subtle: '#fff7ed'
  			},
  			surface: {
  				app: '#fafaf9',
  				warm: '#faf6f1',
  				muted: '#f5f5f4',
  				card: '#ffffff',
  				accent: '#ffedd5',
  				'accent-subtle': '#fff7ed',
  				'accent-lightest': '#fff2eb',
  				overlay: '#e1dddd',
  				inverted: '#000000'
  			},
  			ink: {
  				primary: '#020617',
  				heading: '#0f172a',
  				secondary: '#262626',
  				body: '#334155',
  				muted: '#737373',
  				subtle: '#52525b',
  				tertiary: '#64748b',
  				brand: '#c2410c',
  				link: '#2563eb',
  				'on-primary': '#ffffff',
  				error: '#dc2626',
  				success: '#15803d'
  			},
  			edge: {
  				DEFAULT: '#e2e8f0',
  				default: '#e2e8f0',
  				warm: '#ead4c9',
  				'warm-light': '#eadcc9',
  				muted: '#d4d4d8',
  				strong: '#cbd5e1',
  				brand: '#bb4d00',
  				accent: '#ffedd5',
  				subtle: '#94a3b8',
  				focus: '#3b82f6'
  			},
  			status: {
  				error: '#dc2626',
  				warning: '#fbbf24',
  				success: '#16a34a'
  			},
  			traffic: {
  				close: '#ff6154',
  				minimize: '#ffbd36',
  				maximize: '#29c742'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'rd-sm': '4px',
  			'rd-md': '6px',
  			'rd-lg': '8px',
  			'rd-xl': '12px',
  			'rd-2xl': '16px'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}