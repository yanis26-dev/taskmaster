import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        monday: {
          primary: '#0073ea',
          'primary-hover': '#0060b9',
          'primary-selected': '#cce5ff',
          text: '#323338',
          'text-secondary': '#676879',
          'text-tertiary': '#c5c7d0',
          'surface-primary': '#ffffff',
          'surface-secondary': '#f5f6f8',
          'surface-hover': '#dcdfec',
          border: '#d0d4e4',
          'border-light': '#e6e9ef',

          // Status
          'status-done': '#00c875',
          'status-working': '#fdab3d',
          'status-stuck': '#e2445c',
          'status-not-started': '#c4c4c4',
          'status-waiting': '#a25ddc',

          // Priority
          'priority-critical': '#333333',
          'priority-high': '#401694',
          'priority-medium': '#5559df',
          'priority-low': '#579bfc',

          // Group header colors
          'group-blue': '#579bfc',
          'group-green': '#00c875',
          'group-purple': '#a25ddc',
          'group-orange': '#fdab3d',
          'group-pink': '#e2445c',
          'group-teal': '#66ccff',
        },
        // Legacy token aliases
        border: '#d0d4e4',
        input: '#d0d4e4',
        ring: '#0073ea',
        background: '#ffffff',
        foreground: '#323338',
        primary: {
          DEFAULT: '#0073ea',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f5f6f8',
          foreground: '#323338',
        },
        muted: {
          DEFAULT: '#f5f6f8',
          foreground: '#676879',
        },
        accent: {
          DEFAULT: '#cce5ff',
          foreground: '#0073ea',
        },
        destructive: {
          DEFAULT: '#e2445c',
          foreground: '#ffffff',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#323338',
        },
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        sm: '4px',
      },
      fontFamily: {
        sans: ['var(--font-figtree)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'slide-in-from-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in-from-right 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
