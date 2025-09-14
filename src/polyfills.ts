// Node.js polyfills for browser environment
import { Buffer } from 'buffer';

// Ensure Buffer is available globally
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

// Ensure global and globalThis are properly set
if (typeof globalThis !== 'undefined') {
  if (typeof (globalThis as any).Buffer === 'undefined') {
    (globalThis as any).Buffer = Buffer;
  }
  if (typeof (globalThis as any).global === 'undefined') {
    (globalThis as any).global = globalThis;
  }
}

// Create a comprehensive process polyfill with actual environment variables
// This MUST be done before any other modules try to access process
const processPolyfill = {
  env: {
    // Include actual Vite environment variables
    VITE_GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    VITE_ZEROG_PRIVATE_KEY: import.meta.env.VITE_ZEROG_PRIVATE_KEY,
    VITE_ZEROG_RPC_URL: import.meta.env.VITE_ZEROG_RPC_URL,
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
    // Common Node.js environment variables that 0g-kit might expect
    NODE_ENV: import.meta.env.MODE || 'development',
    // 0g-kit specific environment variables (do not set DOTENV_KEY in browser)
    ZEROG_PRIVATE_KEY: import.meta.env.VITE_ZEROG_PRIVATE_KEY,
    ZEROG_RPC_URL: import.meta.env.VITE_ZEROG_RPC_URL,
    // Add any other environment variables your app needs
  },
  platform: 'browser',
  version: 'v16.0.0',
  browser: true,
  nextTick: (callback: Function) => setTimeout(callback, 0),
  cwd: () => '/',
  chdir: () => {},
  umask: () => 0,
  getuid: () => 0,
  getgid: () => 0,
  geteuid: () => 0,
  getegid: () => 0,
  kill: () => {},
  exit: () => {},
  on: () => {},
  once: () => {},
  emit: () => {},
  addListener: () => {},
  removeListener: () => {},
  removeAllListeners: () => {},
  setMaxListeners: () => {},
  getMaxListeners: () => 0,
  listeners: () => [],
  listenerCount: () => 0,
  prependListener: () => {},
  prependOnceListener: () => {},
  eventNames: () => [],
  pid: 1,
  title: 'browser',
  arch: 'x64',
  argv: [],
  execArgv: [],
  execPath: '/browser',
  abort: () => {},
  allowedNodeEnvironmentFlags: new Set(),
  binding: () => {},
  dlopen: () => {},
  uptime: () => 0,
  hrtime: () => [0, 0],
  cpuUsage: () => ({ user: 0, system: 0 }),
  memoryUsage: () => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }),
  resourceUsage: () => ({ fsRead: 0, fsWrite: 0, voluntaryContextSwitches: 0, involuntaryContextSwitches: 0 }),
  send: () => {},
  disconnect: () => {},
  connected: false,
  stderr: { write: () => {} },
  stdout: { write: () => {} },
  stdin: { read: () => {} },
};

// Set process on globalThis and window to ensure it's available everywhere
(globalThis as any).process = processPolyfill;
if (typeof window !== 'undefined') {
  (window as any).process = processPolyfill;
}

// Also ensure it's available as a global variable
(globalThis as any).global = globalThis;

// Ensure crypto is available
if (typeof crypto === 'undefined') {
  console.warn('Crypto not available in this environment');
}

console.log('Polyfills loaded successfully');
console.log('Process available:', typeof process !== 'undefined');
console.log('Process.cwd available:', typeof process?.cwd === 'function');
console.log('Buffer available:', typeof Buffer !== 'undefined');
console.log('Environment variables loaded:', {
  VITE_GOOGLE_MAPS_API_KEY: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  VITE_ZEROG_PRIVATE_KEY: !!import.meta.env.VITE_ZEROG_PRIVATE_KEY,
  VITE_ZEROG_RPC_URL: !!import.meta.env.VITE_ZEROG_RPC_URL,
  NODE_ENV: import.meta.env.MODE || 'development'
});

// Verify 0g-kit variables are available
if (typeof process !== 'undefined' && process.env) {
  console.log('✅ 0g-kit variables loaded:', {
    ZEROG_PRIVATE_KEY: !!process.env.ZEROG_PRIVATE_KEY,
    ZEROG_RPC_URL: !!process.env.ZEROG_RPC_URL
  });
} else {
  console.error('❌ Process or process.env not accessible!');
}
