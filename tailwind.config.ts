import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: { light: '#ffffff', dark: '#09090b' },
        surface: { light: '#f4f4f5', dark: '#18181b' },
      },
    },
  },
  plugins: [],
}

export default config
