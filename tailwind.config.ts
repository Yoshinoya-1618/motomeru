import type { Config } from 'tailwindcss'

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:'#ECFDF5',100:'#D1FAE5',200:'#A7F3D0',300:'#6EE7B7',
          400:'#34D399',500:'#10B981',600:'#0E9F6E',700:'#0B815A',
          800:'#0A6B4C',900:'#064E3B'
        },
        accent: { citrus:'#F59E0B', violet:'#7C3AED' },
        ink:'#111827',
        subtle:'#6B7280',
        surface:'#F9FAFB',
      },
    },
  },
  plugins: [],
} satisfies Config
