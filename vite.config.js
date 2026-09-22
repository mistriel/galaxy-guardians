import { defineConfig } from 'vite';

// GitHub Pages project site: https://mistriel.github.io/galaxy-guardians/
// Set VITE_BASE=/ when serving the built files from a domain root instead.
const base = process.env.VITE_BASE || '/galaxy-guardians/';

export default defineConfig({
  base,
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
