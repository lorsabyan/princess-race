import { defineConfig } from 'vite'

export default defineConfig({
  // Set by the GitHub Pages workflow (e.g. /princess-race/); local dev stays at /
  base: process.env.DEPLOY_BASE ?? '/',
  resolve: {
    dedupe: ['three'],
  },
})
