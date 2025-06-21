import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Redirigir a la función de Cloud Run con prefijo /api
      '/api': {
        target: 'https://stt-function-gjoom7xsla-ew.a.run.app',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // Redirigir directamente a la función de Cloud Run
      '/transcribe': {
        target: 'https://stt-function-gjoom7xsla-ew.a.run.app',
        changeOrigin: true,
        secure: false
      },
      // Redirigir a la función de Cloud Run con prefijo /gcp
      '/gcp': {
        target: 'https://stt-function-gjoom7xsla-ew.a.run.app',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/gcp/, '')
      }
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  preview: {
    port: 4173,
  },
});