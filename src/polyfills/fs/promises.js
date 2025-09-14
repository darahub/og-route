// fs/promises polyfill for browser compatibility
export const readFile = async () => '';
export const writeFile = async () => {};
export const mkdir = async () => {};
export const readdir = async () => [];
export const stat = async () => ({ isFile: () => false, isDirectory: () => false });
export const access = async () => {};
export const unlink = async () => {};
export const rmdir = async () => {};
export const open = async () => ({
  read: async () => ({ bytesRead: 0, buffer: new ArrayBuffer(0) }),
  write: async () => ({ bytesWritten: 0, buffer: new ArrayBuffer(0) }),
  close: async () => {},
});
