// assert polyfill for browser compatibility
export const ok = (value, message) => {
  if (!value) {
    throw new Error(message || 'Assertion failed');
  }
};

export const equal = (actual, expected, message) => {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
};

export const notEqual = (actual, expected, message) => {
  if (actual === expected) {
    throw new Error(message || `Expected not ${expected} but got ${actual}`);
  }
};

export const deepEqual = (actual, expected, message) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
};

export const notDeepEqual = (actual, expected, message) => {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    throw new Error(message || `Expected not ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
};

export const strictEqual = equal;
export const notStrictEqual = notEqual;
export const throws = (fn, error, message) => {
  try {
    fn();
    throw new Error(message || 'Expected function to throw');
  } catch (e) {
    if (error && !(e instanceof error)) {
      throw new Error(message || `Expected ${error.name} but got ${e.constructor.name}`);
    }
  }
};

export const doesNotThrow = (fn, error, message) => {
  try {
    fn();
  } catch (e) {
    if (!error || e instanceof error) {
      throw new Error(message || 'Expected function not to throw');
    }
  }
};

export const fail = (message) => {
  throw new Error(message || 'Failed');
};

// Default export
export default {
  ok,
  equal,
  notEqual,
  deepEqual,
  notDeepEqual,
  strictEqual,
  notStrictEqual,
  throws,
  doesNotThrow,
  fail,
};
