/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        greenman: {
          0: '#e8f6ee',
          1: '#d1edde',
          2: '#a8debe',
          3: '#7bcd9b',
          4: '#52bd7b',
          5: '#2fb160',
          6: '#0e9a47',
          7: '#007d38',
          8: '#006e30',
          9: '#00622a',
        },
        background: '#ffffff',
        surface: '#ffffff',
        border: '#ececec',
        muted: '#6b7280',
        ink: '#0f1a12',
        'ink-dim': '#5b6360',
      },
      fontFamily: {
        sans: ['Manrope_400Regular', 'System'],
        medium: ['Manrope_500Medium', 'System'],
        semibold: ['Manrope_600SemiBold', 'System'],
        bold: ['Manrope_700Bold', 'System'],
        display: ['Manrope_800ExtraBold', 'System'],
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '28px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 26, 18, 0.04), 0 4px 12px rgba(15, 26, 18, 0.06)',
        pop: '0 8px 24px rgba(15, 26, 18, 0.1)',
      },
    },
  },
  plugins: [],
};
