/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        carbon: {
          DEFAULT: '#1A1A2E',
          light: '#222240',
          dark: '#121220',
        },
        'orange-accent': '#FF6B35',
        mint: '#00E5A0',
        warning: '#FFB800',
        danger: '#FF4757',
        'class-yoga': '#8B5CF6',
        'class-boxing': '#EF4444',
        'class-spinning': '#3B82F6',
        'class-pilates': '#10B981',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        noto: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: {
            opacity: '0',
            transform: 'translateY(8px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
};
