import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DEV_HOST = '172.20.1.81';
const DEV_PORT = 5173;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: DEV_HOST,
    port: DEV_PORT,
    strictPort: true,
    allowedHosts: [DEV_HOST, 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/webhooks': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
