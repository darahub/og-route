import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import inject from '@rollup/plugin-inject';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = env.VITE_API_URL || 'http://localhost:4000';
  return {
    plugins: [
      react(),
    ],
    server: {
      proxy: {
        '/api': { target: apiUrl, changeOrigin: true },
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react', '@0glabs/0g-serving-broker'],
      include: ['buffer', 'stream-browserify'],
      esbuildOptions: { define: { global: 'globalThis' } },
    },
    define: {
      global: 'globalThis',
      'process.platform': '"browser"',
      'process.version': '"v16.0.0"',
      'process.browser': 'true',
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
        os: 'os-browserify/browser',
        path: 'path-browserify',
        util: resolve(__dirname, 'src/polyfills/util-polyfill.js'),
        assert: resolve(__dirname, 'src/polyfills/assert-polyfill.js'),
        'fs/promises': resolve(__dirname, 'src/polyfills/fs/promises.js'),
        fs: resolve(__dirname, 'src/polyfills/fs-polyfill.js'),
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
        plugins: [
          inject({
            Buffer: ['buffer', 'Buffer'],
            process: 'process',
          }),
        ],
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['lucide-react', 'recharts'],
            'crypto-vendor': ['ethers', 'buffer'],
          },
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    minify: 'esbuild',
  };
});
