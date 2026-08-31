import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#E05353',
          dark: '#1E242B',
          bg: '#F8F9FB',
        },
      },
    },
  },
  plugins: [],
};

export default config;