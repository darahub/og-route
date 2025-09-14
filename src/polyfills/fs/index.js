// fs polyfill for browser compatibility
export default {};
export const readFileSync = () => '';
export const writeFileSync = () => {};
export const existsSync = () => false;
export const mkdirSync = () => {};
export const readdirSync = () => [];
export const statSync = () => ({ isFile: () => false, isDirectory: () => false });
export const createReadStream = () => ({});
export const createWriteStream = () => {};

// Export promises submodule
export * as promises from './promises.js';
