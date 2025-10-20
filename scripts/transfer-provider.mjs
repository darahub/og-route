import { writeFile } from 'node:fs/promises';

const API = 'https://og-route.onrender.com';
const provider = process.argv[2] || '';
const amount = process.argv[3] || '0.05';
const serviceType = process.argv[4] || 'inference';

async function fetchJSON(path, opts = {}) {
  try {
    const res = await fetch(`${API}${path}`, opts);
    const ct = res.headers.get('content-type') || '';
    let body = null;
    let text = null;
    if (ct.includes('application/json')) {
      body = await res.json();
    } else {
      text = await res.text();
    }
    return { ok: res.ok, status: res.status, body, text };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

async function main() {
  if (!provider) {
    console.error('Usage: node scripts/transfer-provider.mjs <provider> [amount] [serviceType]');
    process.exit(1);
  }
  const payload = { provider, amount, serviceType };
  const res = await fetchJSON('/api/ledger/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const ledger = await fetchJSON('/api/ledger');
  const out = { provider, amount, serviceType, res, ledger };
  await writeFile('cli-output/transfer-result.json', JSON.stringify(out, null, 2));
  console.log('WROTE cli-output/transfer-result.json');
}

main();