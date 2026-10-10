/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        navy: '#101747',
        muted: '#65708B',
        gold: '#E4B64D',
        paper: '#FFFEFC',
        outline: '#E1E4EC',
      },
    },
  },
  plugins: [],
};
