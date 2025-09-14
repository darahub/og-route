// util polyfill for browser compatibility
export const inspect = (obj) => JSON.stringify(obj, null, 2);
export const debuglog = (section) => (msg) => console.log(`[${section}] ${msg}`);
export const format = (fmt, ...args) => {
  return fmt.replace(/%s/g, () => args.shift() || '');
};
export const inherits = (constructor, superConstructor) => {
  constructor.prototype = Object.create(superConstructor.prototype);
  constructor.prototype.constructor = constructor;
};
export const deprecate = (fn, msg) => {
  return function(...args) {
    console.warn(`DeprecationWarning: ${msg}`);
    return fn.apply(this, args);
  };
};
