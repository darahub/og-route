import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = env.VITE_API_URL || 'http://localhost:4000';
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
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
      // Define Node.js modules as empty objects to prevent import errors
      // Note: crypto is handled specially since it's read-only in browsers
      'stream': '{}',
      'fs': '{}',
      'os': '{}',
      'path': '{}',
      'util': '{}',
      'child_process': '{}',
      'net': '{}',
      'tls': '{}',
      'vm': '{}',
      'readline': '{}',
    },
    envPrefix: 'VITE_',
    resolve: {
      alias: {
        buffer: 'buffer',
        stream: 'stream-browserify',
        crypto: 'crypto-browserify',
        'node:crypto': 'crypto-browserify',
        // Use custom polyfills for Node.js modules
        os: 'os-browserify/browser',
        path: 'path-browserify',
        util: resolve(__dirname, 'src/polyfills/util-polyfill.js'),
        assert: resolve(__dirname, 'src/polyfills/assert-polyfill.js'),
        fs: resolve(__dirname, 'src/polyfills/fs'),
        'node:fs/promises': resolve(__dirname, 'src/polyfills/fs/promises.js'),
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
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['lucide-react', 'recharts'],
            'crypto-vendor': ['ethers', 'crypto-browserify', 'buffer'],
            // 0G libraries are now dynamically imported, so they won't be in vendor chunks
          },
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    minify: 'esbuild',
-  },
+  };
});
