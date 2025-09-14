// vm polyfill for browser compatibility
export const createContext = (sandbox) => sandbox || {};

export const runInContext = (code, sandbox, options) => {
  // Basic evaluation - be careful with this in production
  try {
    return eval(code);
  } catch (error) {
    throw new Error(`VM execution error: ${error.message}`);
  }
};

export const runInNewContext = (code, sandbox, options) => {
  return runInContext(code, sandbox, options);
};

export const runInThisContext = (code, options) => {
  return runInContext(code, globalThis, options);
};

export const Script = class Script {
  constructor(code, options) {
    this.code = code;
    this.options = options;
  }
  
  runInContext(sandbox, options) {
    return runInContext(this.code, sandbox, options);
  }
  
  runInNewContext(sandbox, options) {
    return runInNewContext(this.code, sandbox, options);
  }
  
  runInThisContext(options) {
    return runInThisContext(this.code, options);
  }
};

export default {
  createContext,
  runInContext,
  runInNewContext,
  runInThisContext,
  Script,
};
