// Tailwind 3 runs through PostCSS: @astrojs/tailwind stops at Astro 5, and Tailwind 4
// (@tailwindcss/vite) is a separate migration. The global stylesheet carries the
// @tailwind directives, so no Astro integration is needed.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
