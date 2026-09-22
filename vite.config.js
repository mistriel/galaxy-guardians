import { defineConfig } from 'vite';

// Relative asset URLs so the production build works on GitHub Pages
// project sites (https://<user>.github.io/galaxy-guardians/) and local preview.
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
});
