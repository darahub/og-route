import { writeFile } from 'node:fs/promises';

const API = 'https://og-route.onrender.com';

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
  const results = {};

  // Basic checks
  results.health = await fetchJSON('/api/health');
  results.wallet = await fetchJSON('/api/wallet');
  results.balance = await fetchJSON('/api/balance');
  results.ledger = await fetchJSON('/api/ledger');

  // Services (provider addresses)
  results.services = await fetchJSON('/api/compute/services');
  const providers = [];
  try {
    const svc = results.services?.body?.services || [];
    for (const s of svc) {
      if (s?.provider) providers.push(s.provider);
    }
  } catch {}

  const knownProviders = [
    '0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3',
    '0xf07240Efa67755B5311bc75784a061eDB47165Dd'
  ];
  const toFund = providers.length ? providers.slice(0, 1) : knownProviders;

  // Transfer funds into provider subaccount(s)
  results.transfer = [];
  for (const provider of toFund) {
    const payload = { provider, amount: '1', serviceType: 'inference' };
    const res = await fetchJSON('/api/ledger/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    results.transfer.push({ provider, res });
  }

  // Ledger after transfer
  results.ledgerAfter = await fetchJSON('/api/ledger');

  // Chat test
  results.chat = await fetchJSON('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Test traffic analysis for downtown commute.' })
  });

  await writeFile('cli-output/remote-check.json', JSON.stringify(results, null, 2));
  console.log('WROTE cli-output/remote-check.json');
}

main();