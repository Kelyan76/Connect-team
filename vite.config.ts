import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Chemins relatifs : le build peut être servi depuis n'importe quel dossier (démo partagée).
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  server: {
    port: 5173,
    strictPort: true,
    // Echo (application de prise de parole) : même chemin qu'en production (réécriture Vercel), pas de CORS.
    proxy: {
      // Clé en expression régulière : sinon « /api/echo » capterait aussi « /api/echo-chat ».
      '^/api/echo$': {
        target: 'https://think-task-flow.lovable.app',
        changeOrigin: true,
        rewrite: () => '/api/public/transcribe',
      },
      // Assistant IA (même application Echo) : feedbacks DESC, objectifs SMART, préparation, décisions.
      '/api/echo-chat': {
        target: 'https://think-task-flow.lovable.app',
        changeOrigin: true,
        rewrite: () => '/api/public/chat-transcript',
      },
    },
  },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          data: ['@supabase/supabase-js', '@tanstack/react-query'],
          charts: ['recharts'],
        },
      },
    },
  },
});
