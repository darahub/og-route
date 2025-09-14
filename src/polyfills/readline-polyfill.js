// readline polyfill for browser compatibility
export const createInterface = (options) => ({
  on: () => {},
  close: () => {},
  write: () => {},
  question: (query, callback) => {
    if (callback) callback('');
  },
});

export const emitKeypressEvents = () => {};

export const clearLine = () => {};

export const clearScreenDown = () => {};

export const cursorTo = () => {};

export const moveCursor = () => {};

export default {
  createInterface,
  emitKeypressEvents,
  clearLine,
  clearScreenDown,
  cursorTo,
  moveCursor,
};
