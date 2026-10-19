import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for SkillVerse
// Proxies relative /api requests from the browser to the Flask backend on port 5000.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
