// child_process polyfill for browser compatibility
export const spawn = () => ({
  stdout: { on: () => {}, pipe: () => {} },
  stderr: { on: () => {}, pipe: () => {} },
  on: () => {},
  kill: () => {},
});

export const exec = (command, options, callback) => {
  if (callback) callback(null, '', '');
  return { on: () => {} };
};

export const execSync = () => '';

export const fork = () => ({
  on: () => {},
  send: () => {},
  kill: () => {},
});

export const execFile = (file, args, options, callback) => {
  if (callback) callback(null, '', '');
  return { on: () => {} };
};

export const execFileSync = () => '';

export default {
  spawn,
  exec,
  execSync,
  fork,
  execFile,
  execFileSync,
};
