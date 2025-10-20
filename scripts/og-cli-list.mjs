import 'dotenv/config';
import { spawnSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';

const pk = process.env.VITE_ZEROG_PRIVATE_KEY || process.env.ZEROG_PRIVATE_KEY || process.env.PRIVATE_KEY;
const rpc = process.env.RPC_ENDPOINT || 'https://evmrpc-testnet.0g.ai';

if (!pk) {
  console.error('No private key found in environment (.env). Expected VITE_ZEROG_PRIVATE_KEY or ZEROG_PRIVATE_KEY or PRIVATE_KEY.');
  process.exit(1);
}

mkdirSync('cli-output', { recursive: true });

function run(cmd, args, file) {
  const res = spawnSync(cmd, args, {
    env: { ...process.env, ZG_PRIVATE_KEY: pk, RPC_ENDPOINT: rpc },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  writeFileSync(`cli-output/${file}`, `${res.stdout || ''}${res.stderr || ''}`);
  if (res.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')} (status ${res.status})`);
  }
  return res;
}

const account = run('0g-compute-cli', ['get-account'], 'account.txt');
const providers = run('0g-compute-cli', ['list-providers'], 'providers.txt');
const models = run('0g-compute-cli', ['list-models'], 'models.txt');

console.log('=== Account ===');
console.log((account.stdout || '').split('\n').slice(0, 20).join('\n'));
console.log('=== Providers (top) ===');
console.log((providers.stdout || '').split('\n').slice(0, 40).join('\n'));
console.log('=== Models (top) ===');
console.log((models.stdout || '').split('\n').slice(0, 40).join('\n'));