// Empty fs polyfill for browser compatibility
export default {};
export const readFileSync = () => '';
export const writeFileSync = () => {};
export const existsSync = () => false;
export const mkdirSync = () => {};
export const readdirSync = () => [];
export const statSync = () => ({ isFile: () => false, isDirectory: () => false });
export const createReadStream = () => ({});
export const createWriteStream = () => {};

// Handle fs/promises import
export const promises = {
  readFile: async () => '',
  writeFile: async () => {},
  mkdir: async () => {},
  readdir: async () => [],
  stat: async () => ({ isFile: () => false, isDirectory: () => false }),
  access: async () => {},
  unlink: async () => {},
  rmdir: async () => {},
};
