import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8000,
    open: true
  },
  build: {
    outDir: 'dist',
    target: 'esnext', // Use latest ES features
    sourcemap: true
  },
  optimizeDeps: {
    force: true // Force dependency pre-bundling
  }
});