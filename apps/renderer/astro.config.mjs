import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

const SITE_URL = process.env.SITE_URL ?? 'https://renderer.example.test';

export default defineConfig({
  site: SITE_URL,
  output: 'server',
  security: {
    // Renderer hosts are dynamic tenant domains; form ingress validates the
    // active tenant by Host before forwarding to CMS, so Astro's static
    // site-origin CSRF check would reject legitimate tenant POSTs.
    checkOrigin: false,
  },
  adapter: node({
    mode: 'standalone',
  }),
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
