/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  presets: [],
  theme: {
    extend: {
      colors: {
        bgBase: '#0A0908',
        bgSurface: '#161311',
        bgElevated: '#211C18',
        accentFrom: '#FF6A00',
        accentTo: '#FFC400',
        accentSolid: '#FF8800',
        accentMuted: 'rgba(201, 98, 0, 0.13)',
        textPrimary: '#F5F1ED',
        textSecondary: '#A39B92',
        textDisabled: '#5C564F',
        success: '#4CAF6D',
        error: '#E5484D',
      },
    },
  },
  plugins: [],
}
