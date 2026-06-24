import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary:   '#172161', // dark navy — headings, footer, primary buttons
          secondary: '#1E5D7C', // teal-blue — body text, links
          accent:    '#2EAFA0', // teal — accents, hover states, buttons
          light:     '#FAFAFA', // light gray — alternating backgrounds
          bluegray:  '#F9FAFD', // very light blue-gray — section backgrounds
          border:    '#C8D5DC', // light blue-gray borders
          surface:   '#FFFFFF', // white cards/inputs
          text:      '#1E5D7C', // body text
          heading:   '#172161', // headings
          muted:     '#5A7A8A', // secondary text
          dark:      '#172161', // footer background
        },
      },
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        body:    ['Poppins', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #1E5D7C 0%, #2EAFA0 100%)',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(23, 33, 97, 0.08)',
      },
    },
  },
  plugins: [typography],
} satisfies Config
