import { writeFile } from 'node:fs/promises';

const API = 'https://og-route.onrender.com';
const prompt = process.argv.slice(2).join(' ') || 'Analyze traffic patterns for downtown from 5pm.';

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
  const chat = await fetchJSON('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  await writeFile('cli-output/chat-result.json', JSON.stringify({ chat }, null, 2));
  console.log('WROTE cli-output/chat-result.json');
}

main();