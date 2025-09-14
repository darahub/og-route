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

// Create comprehensive stream polyfill
const createStreamPolyfill = () => ({
  Readable: class Readable {
    constructor() {}
    on() { return this; }
    once() { return this; }
    emit() { return this; }
    pipe() { return this; }
    read() { return null; }
    destroy() { return this; }
    _read() {}
  },
  Writable: class Writable {
    constructor() {}
    write() { return true; }
    end() { return this; }
    on() { return this; }
    once() { return this; }
    emit() { return this; }
    destroy() { return this; }
    _write() {}
  },
  Transform: class Transform {
    constructor() {}
    write() { return true; }
    end() { return this; }
    on() { return this; }
    once() { return this; }
    emit() { return this; }
    pipe() { return this; }
    destroy() { return this; }
    _transform() {}
  },
  Duplex: class Duplex {
    constructor() {}
    write() { return true; }
    end() { return this; }
    on() { return this; }
    once() { return this; }
    emit() { return this; }
    pipe() { return this; }
    read() { return null; }
    destroy() { return this; }
    _read() {}
    _write() {}
  },
  PassThrough: class PassThrough {
    constructor() {}
    write() { return true; }
    end() { return this; }
    on() { return this; }
    once() { return this; }
    emit() { return this; }
    pipe() { return this; }
    read() { return null; }
    destroy() { return this; }
    _read() {}
    _write() {}
  }
});

// Create comprehensive fs polyfill
const createFsPolyfill = () => ({
  readFile: () => Promise.resolve(''),
  writeFile: () => Promise.resolve(),
  readFileSync: () => '',
  writeFileSync: () => {},
  existsSync: () => false,
  stat: () => Promise.resolve({ isFile: () => false, isDirectory: () => false }),
  mkdir: () => Promise.resolve(),
  readdir: () => Promise.resolve([]),
  access: () => Promise.resolve(),
  unlink: () => Promise.resolve(),
  rmdir: () => Promise.resolve(),
  open: () => Promise.resolve({
    read: () => Promise.resolve({ bytesRead: 0, buffer: new ArrayBuffer(0) }),
    write: () => Promise.resolve({ bytesWritten: 0, buffer: new ArrayBuffer(0) }),
    close: () => Promise.resolve()
  }),
  createReadStream: () => new (createStreamPolyfill().Readable)(),
  createWriteStream: () => new (createStreamPolyfill().Writable)(),
  promises: {
    readFile: () => Promise.resolve(''),
    writeFile: () => Promise.resolve(),
    mkdir: () => Promise.resolve(),
    readdir: () => Promise.resolve([]),
    stat: () => Promise.resolve({ isFile: () => false, isDirectory: () => false }),
    access: () => Promise.resolve(),
    unlink: () => Promise.resolve(),
    rmdir: () => Promise.resolve(),
    open: () => Promise.resolve({
      read: () => Promise.resolve({ bytesRead: 0, buffer: new ArrayBuffer(0) }),
      write: () => Promise.resolve({ bytesWritten: 0, buffer: new ArrayBuffer(0) }),
      close: () => Promise.resolve()
    })
  }
});

// Create comprehensive crypto polyfill
const createCryptoPolyfill = () => {
  const webCrypto = typeof crypto !== 'undefined' ? crypto : null;
  
  return {
    randomBytes: (size: number) => {
      if (webCrypto) {
        const array = new Uint8Array(size);
        webCrypto.getRandomValues(array);
        return Buffer.from(array);
      }
      return Buffer.alloc(size);
    },
    createHash: () => ({
      update: () => {},
      digest: () => Buffer.alloc(32)
    }),
    createHmac: () => ({
      update: () => {},
      digest: () => Buffer.alloc(32)
    }),
    pbkdf2: () => Promise.resolve(Buffer.alloc(32)),
    pbkdf2Sync: () => Buffer.alloc(32),
    scrypt: () => Promise.resolve(Buffer.alloc(32)),
    scryptSync: () => Buffer.alloc(32),
    randomFill: () => Buffer.alloc(32),
    randomFillSync: () => Buffer.alloc(32),
    getRandomValues: webCrypto ? webCrypto.getRandomValues.bind(webCrypto) : () => {}
  };
};

// Create comprehensive os polyfill
const createOsPolyfill = () => ({
  platform: () => 'browser',
  arch: () => 'x64',
  cpus: () => [],
  freemem: () => 0,
  totalmem: () => 0,
  uptime: () => 0,
  homedir: () => '/',
  tmpdir: () => '/tmp',
  hostname: () => 'browser',
  type: () => 'Browser',
  release: () => '1.0.0',
  networkInterfaces: () => ({}),
  userInfo: () => ({ username: 'browser', uid: 0, gid: 0, shell: '/bin/sh', homedir: '/' })
});

// Create comprehensive path polyfill
const createPathPolyfill = () => ({
  join: (...args: string[]) => args.join('/'),
  resolve: (...args: string[]) => args.join('/'),
  dirname: (path: string) => path.split('/').slice(0, -1).join('/') || '/',
  basename: (path: string) => path.split('/').pop() || '',
  extname: (path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  },
  sep: '/',
  delimiter: ':',
  posix: {
    join: (...args: string[]) => args.join('/'),
    resolve: (...args: string[]) => args.join('/'),
    dirname: (path: string) => path.split('/').slice(0, -1).join('/') || '/',
    basename: (path: string) => path.split('/').pop() || '',
    extname: (path: string) => {
      const parts = path.split('.');
      return parts.length > 1 ? '.' + parts.pop() : '';
    },
    sep: '/',
    delimiter: ':'
  }
});

// Create comprehensive util polyfill
const createUtilPolyfill = () => ({
  inspect: (obj: any) => JSON.stringify(obj, null, 2),
  format: (format: string, ...args: any[]) => {
    let result = format;
    args.forEach((arg, index) => {
      result = result.replace(`%${index + 1}`, String(arg));
    });
    return result;
  },
  promisify: (fn: Function) => fn,
  callbackify: (fn: Function) => fn,
  inherits: () => {},
  deprecate: (fn: Function) => fn,
  isArray: Array.isArray,
  isBoolean: (val: any) => typeof val === 'boolean',
  isBuffer: (val: any) => Buffer.isBuffer(val),
  isDate: (val: any) => val instanceof Date,
  isError: (val: any) => val instanceof Error,
  isFunction: (val: any) => typeof val === 'function',
  isNull: (val: any) => val === null,
  isNullOrUndefined: (val: any) => val === null || val === undefined,
  isNumber: (val: any) => typeof val === 'number',
  isObject: (val: any) => typeof val === 'object' && val !== null,
  isPrimitive: (val: any) => val === null || typeof val !== 'object',
  isRegExp: (val: any) => val instanceof RegExp,
  isString: (val: any) => typeof val === 'string',
  isSymbol: (val: any) => typeof val === 'symbol',
  isUndefined: (val: any) => val === undefined
});

// Create comprehensive child_process polyfill
const createChildProcessPolyfill = () => ({
  spawn: () => ({
    on: () => {},
    kill: () => {},
    stdout: { on: () => {}, pipe: () => {} },
    stderr: { on: () => {}, pipe: () => {} },
    stdin: { write: () => {}, end: () => {} }
  }),
  exec: () => {},
  execFile: () => {},
  fork: () => {},
  execSync: () => '',
  spawnSync: () => ({ status: 0, stdout: '', stderr: '' })
});

// Create comprehensive net polyfill
const createNetPolyfill = () => ({
  createConnection: () => ({
    on: () => {},
    write: () => {},
    end: () => {},
    destroy: () => {}
  }),
  createServer: () => ({
    on: () => {},
    listen: () => {},
    close: () => {}
  }),
  connect: () => ({
    on: () => {},
    write: () => {},
    end: () => {},
    destroy: () => {}
  }),
  Socket: class Socket {
    constructor() {}
    on() { return this; }
    write() { return true; }
    end() { return this; }
    destroy() { return this; }
    connect() { return this; }
  },
  Server: class Server {
    constructor() {}
    on() { return this; }
    listen() { return this; }
    close() { return this; }
  }
});

// Create comprehensive tls polyfill
const createTlsPolyfill = () => ({
  createConnection: () => ({
    on: () => {},
    write: () => {},
    end: () => {},
    destroy: () => {}
  }),
  createServer: () => ({
    on: () => {},
    listen: () => {},
    close: () => {}
  }),
  connect: () => ({
    on: () => {},
    write: () => {},
    end: () => {},
    destroy: () => {}
  }),
  Socket: class Socket {
    constructor() {}
    on() { return this; }
    write() { return true; }
    end() { return this; }
    destroy() { return this; }
    connect() { return this; }
  },
  Server: class Server {
    constructor() {}
    on() { return this; }
    listen() { return this; }
    close() { return this; }
  }
});

// Create comprehensive vm polyfill
const createVmPolyfill = () => ({
  createContext: () => ({}),
  runInContext: () => {},
  runInNewContext: () => {},
  runInThisContext: () => {},
  Script: class Script {
    constructor() {}
    runInContext() {}
    runInNewContext() {}
    runInThisContext() {}
  }
});

// Create comprehensive readline polyfill
const createReadlinePolyfill = () => ({
  createInterface: () => ({
    on: () => {},
    close: () => {},
    write: () => {},
    question: (query: string, callback: Function) => {
      if (callback) callback('');
    }
  }),
  emitKeypressEvents: () => {},
  clearLine: () => {},
  clearScreenDown: () => {},
  cursorTo: () => {},
  moveCursor: () => {}
});

// Set up all polyfills
const streamPolyfill = createStreamPolyfill();
const fsPolyfill = createFsPolyfill();
const cryptoPolyfill = createCryptoPolyfill();
const osPolyfill = createOsPolyfill();
const pathPolyfill = createPathPolyfill();
const utilPolyfill = createUtilPolyfill();
const childProcessPolyfill = createChildProcessPolyfill();
const netPolyfill = createNetPolyfill();
const tlsPolyfill = createTlsPolyfill();
const vmPolyfill = createVmPolyfill();
const readlinePolyfill = createReadlinePolyfill();

// Make polyfills available globally
if (typeof globalThis !== 'undefined') {
  (globalThis as any).stream = streamPolyfill;
  (globalThis as any).fs = fsPolyfill;
  // Don't override the native crypto - use a different name for Node.js crypto
  (globalThis as any).nodeCrypto = cryptoPolyfill;
  (globalThis as any).os = osPolyfill;
  (globalThis as any).path = pathPolyfill;
  (globalThis as any).util = utilPolyfill;
  (globalThis as any).child_process = childProcessPolyfill;
  (globalThis as any).net = netPolyfill;
  (globalThis as any).tls = tlsPolyfill;
  (globalThis as any).vm = vmPolyfill;
  (globalThis as any).readline = readlinePolyfill;
}

if (typeof window !== 'undefined') {
  (window as any).stream = streamPolyfill;
  (window as any).fs = fsPolyfill;
  // Don't override the native crypto - use a different name for Node.js crypto
  (window as any).nodeCrypto = cryptoPolyfill;
  (window as any).os = osPolyfill;
  (window as any).path = pathPolyfill;
  (window as any).util = utilPolyfill;
  (window as any).child_process = childProcessPolyfill;
  (window as any).net = netPolyfill;
  (window as any).tls = tlsPolyfill;
  (window as any).vm = vmPolyfill;
  (window as any).readline = readlinePolyfill;
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
