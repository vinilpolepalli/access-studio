import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand accent: deep clinical green. Chosen for a healthcare-trust read and to
        // stay well clear of the sibling demos' accents (navy, teal, bronze, crimson,
        // burnt orange, olive). Olive is yellow-green; this is a true green (#15803d).
        accent: { DEFAULT: '#15803d', hover: '#166534', soft: '#f0f7f2' },
        ink: '#171a17',
        muted: '#5d655e',
        hair: '#e3e6e3',
        ground: '#fcfdfc',
      },
      borderRadius: { btn: '8px', card: '10px', input: '8px' },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
