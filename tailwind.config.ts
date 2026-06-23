import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary:   '#0A1A1F',
          secondary: '#0F2E33',
          surface:   '#0A1A1F',
          abyss:     '#083B4B',
          accent:    '#0B4F6C',
          azure:     '#2BBBAD',
          highlight: '#3CCEC0',
          cyantext:  '#1EAE98',
          text:      '#F4F8F8',
          muted:     '#8BA0A2',
          border:    '#1A3237',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #083B4B 0%, #0B4F6C 35%, #2BBBAD 65%, #3CCEC0 100%)',
      },
      boxShadow: {
        'glow-blue': '0 0 24px rgba(11,79,108,0.35)',
        'glow-cyan': '0 0 24px rgba(60,206,192,0.35)',
        'card':      '0 4px 24px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [typography],
} satisfies Config
