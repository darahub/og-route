import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000'
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['buffer', 'stream-browserify', 'crypto-browserify'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  define: {
    global: 'globalThis',
    // Let custom polyfills handle process.env
    'process.platform': '"browser"',
    'process.version': '"v16.0.0"',
    'process.browser': 'true',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
      'node:crypto': 'crypto-browserify',
      // Remove process alias to let custom polyfills handle it
      os: 'os-browserify/browser',
      path: 'path-browserify',
      util: resolve(__dirname, 'src/polyfills/util-polyfill.js'),
      assert: resolve(__dirname, 'src/polyfills/assert-polyfill.js'),
      fs: resolve(__dirname, 'src/polyfills/fs'),
      net: resolve(__dirname, 'src/polyfills/net-polyfill.js'),
      tls: resolve(__dirname, 'src/polyfills/tls-polyfill.js'),
      child_process: resolve(__dirname, 'src/polyfills/child-process-polyfill.js'),
      vm: resolve(__dirname, 'src/polyfills/vm-polyfill.js'),
      readline: resolve(__dirname, 'src/polyfills/readline-polyfill.js'),
    },
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
});
