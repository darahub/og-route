import { writeFile } from 'node:fs/promises';

const API = 'https://og-route.onrender.com';
const amount = process.argv[2] || '1';

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
  const res = await fetchJSON('/api/ledger/fund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  const ledger = await fetchJSON('/api/ledger');
  await writeFile('cli-output/fund-result.json', JSON.stringify({ amount, res, ledger }, null, 2));
  console.log('WROTE cli-output/fund-result.json');
}

main();