/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#040B08', 900: '#06110D', 850: '#081812', 800: '#0C1E15', 700: '#12291E', 600: '#1A3628' },
        line: 'rgba(160, 255, 200, 0.08)',
        mint: { DEFAULT: '#3DF58A', 400: '#3DF58A', 300: '#7CFFB0', 500: '#1ED06A' },
        lime: { DEFAULT: '#C6F432' },
        cyan: { DEFAULT: '#4FE3F0' },
        amber: { DEFAULT: '#F5B83D' },
        ember: { DEFAULT: '#FF7A3D' },
        danger: { DEFAULT: '#FF4D5E' },
        fog: { 100: '#E8F3EC', 300: '#A9BFB2', 400: '#7E978A', 500: '#5B7266', 600: '#3F5449' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
    },
  },
  plugins: [],
};
