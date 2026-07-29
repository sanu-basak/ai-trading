/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic palette (brand-neutral slate + accent).
        bg: '#0b0f17',
        surface: '#131a26',
        'surface-2': '#1b2432',
        border: '#26313f',
        muted: '#8b97a8',
        accent: '#4f8cff',
        'accent-strong': '#2f6fe0',
        bull: '#22c55e',
        bear: '#ef4444',
        watch: '#f59e0b',
      },
    },
  },
  plugins: [],
};
