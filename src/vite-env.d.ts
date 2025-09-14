/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ZEROG_PRIVATE_KEY: string
  readonly VITE_PRIVATE_KEY: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global declarations for Node.js polyfills
declare global {
  interface Window {
    Buffer: typeof Buffer;
    util: any;
    process: any;
  }
}

export {};
