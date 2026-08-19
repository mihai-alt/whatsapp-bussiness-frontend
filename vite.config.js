import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DEV_HOST = '172.20.1.81';
const DEV_PORT = 5173;
const rootDir = path.dirname(fileURLToPath(import.meta.url));

function lucideIconExportFix() {
  return {
    name: 'lucide-icon-export-fix',
    enforce: 'pre',
    transform(code, id) {
      const file = id.replace(/\\/g, '/');
      if (!file.includes('/lucide-react/') || !file.includes('/icons/')) return null;
      if (!code.includes('__iconNode')) return null;
      const next = code.replace(
        /export\s*\{\s*__iconNode\s*,\s*([A-Za-z0-9_]+)\s+as\s+default\s*\}\s*;/,
        'export default $1;\nexport { $1, __iconNode };'
      );
      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  plugins: [lucideIconExportFix(), react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: /^lucide-react$/,
        replacement: path.resolve(rootDir, 'src/lib/lucide.js'),
      },
    ],
    dedupe: ['react', 'react-dom'],
    conditions: ['import', 'module', 'browser', 'default'],
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
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
