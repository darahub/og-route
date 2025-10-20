import 'dotenv/config';
import { spawnSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';

const pk = process.env.VITE_ZEROG_PRIVATE_KEY || process.env.ZEROG_PRIVATE_KEY || process.env.PRIVATE_KEY;
const rpc = process.env.RPC_ENDPOINT || 'https://evmrpc-testnet.0g.ai';
const provider = process.env.DEFAULT_PROVIDER || '0xf07240Efa67755B5311bc75784a061eDB47165Dd';
const model = process.env.DEFAULT_MODEL || 'distilbert-base-uncased';

if (!pk) {
  console.error('No private key found in environment (.env).');
  process.exit(1);
}

mkdirSync('docs/model-usage', { recursive: true });
mkdirSync('cli-output', { recursive: true });

const args = [
  'model-usage',
  '--model', model,
  '--provider', provider,
  '--output', 'docs/model-usage/distilbert-usage.zip',
  '--rpc', rpc,
  '--key', pk,
];

const res = spawnSync('0g-compute-cli', args, {
  env: { ...process.env, ZG_PRIVATE_KEY: pk, RPC_ENDPOINT: rpc },
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

writeFileSync('cli-output/model-usage-distilbert.txt', `${res.stdout || ''}${res.stderr || ''}`);

console.log('status:', res.status);
console.log('output head:\n', (res.stdout || res.stderr || '').split('\n').slice(0, 40).join('\n'));