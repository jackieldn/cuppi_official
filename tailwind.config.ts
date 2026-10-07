import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['"Space Grotesk"', 'sans-serif'],
        code: ['monospace'],
        'sf-pro': ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        serif: ['"Times New Roman"', 'Times', 'serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'collapsible-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' },
        },
        'reveal-left': {
          '0%': { 
            clipPath: 'inset(0 100% 0 0)',
            opacity: '0',
          },
          '100%': { 
            clipPath: 'inset(0 0 0 0)',
            opacity: '1',
          },
        },
        'fade-in-right': {
          '0%': { 
            opacity: '0', 
            transform: 'translateX(-50px)'
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateX(0)'
          },
        },
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
      },
      animation: {
        'collapsible-down': 'collapsible-down 0.5s ease-out',
        'collapsible-up': 'collapsible-up 0.5s ease-out',
        'reveal-left': 'reveal-left 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-right': 'fade-in-right 1.5s ease-out forwards',
        'fade-in-up': 'fade-in-up 1s ease-out forwards',
      },
      transitionDuration: {
        '2000': '2000ms',
        '4000': '4000ms',
      },
      transitionDelay: {
        '2000': '2000ms',
      },
      duration: {
        '1500': '1500ms',
      },
      scale: {
        '110': '1.1',
        '120': '1.2',
        '130': '1.3',
        '140': '1.4',
        '150': '1.5',
        '160': '1.6',
        '210': '2.1',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
