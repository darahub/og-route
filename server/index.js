import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';
import { storageDB } from './storageDatabase.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// 0G Broker instance
let broker = null;

// Simple upload queue to prevent nonce conflicts
let uploadQueue = Promise.resolve();

// Fallback defaults loader
async function loadFallbackDefaults() {
  try {
    const { readFile } = await import('fs/promises');
    const { join } = await import('path');
    const file = join(process.cwd(), 'docs', 'models', 'providers-defaults.json');
    const raw = await readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

// Initialize broker
async function initBroker() {
  if (broker) return broker;

  try {
    const rpcUrl = process.env.ZEROG_RPC_URL || process.env.VITE_ZEROG_RPC_URL || "https://evmrpc-testnet.0g.ai";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.VITE_ZEROG_PRIVATE_KEY || process.env.ZEROG_PRIVATE_KEY || process.env.PRIVATE_KEY;

    if (!privateKey) {
      throw new Error('Private key not found in environment');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    broker = await createZGComputeNetworkBroker(wallet);
    console.log('✅ 0G Broker initialized');
    return broker;
  } catch (error) {
    console.error('Failed to initialize broker:', error);
    throw error;
  }
}

// Make AI inference request
async function sendAIRequest(prompt, providerAddress) {
  const b = await initBroker();

  // Get provider
  let provider = providerAddress;
  try {
    if (!provider) {
      const services = await b.inference.listService();
      provider = services[0]?.provider;
    }
  } catch (e) {
    console.warn('listService failed, will use fallback defaults:', e?.message);
  }

  if (!provider) {
    const defaults = await loadFallbackDefaults();
    provider = defaults?.defaultProvider;
  }

  if (!provider) {
    throw new Error('No provider available');
  }

  // Acknowledge provider
  try {
    await b.inference.acknowledgeProviderSigner(provider);
  } catch (e) {
    console.warn('acknowledgeProviderSigner failed, proceeding optimistically:', e?.message);
  }

  // Ensure provider subaccount has funds for inference
  try {
    const depositStr = process.env.INFERENCE_DEPOSIT || '1';
    const amountWei = ethers.parseEther(depositStr);
    await b.ledger.transferFund(provider, 'inference', amountWei);
    console.log(`Transferred ${depositStr} OG to provider subaccount`);
  } catch (e) {
    console.warn('transferFund skipped:', e?.message);
  }

  // Get service metadata
  let endpoint, model;
  try {
    const meta = await b.inference.getServiceMetadata(provider);
    endpoint = meta.endpoint;
    model = meta.model;
  } catch (e) {
    const defaults = await loadFallbackDefaults();
    model = defaults?.defaultModel || 'distilbert-base-uncased';
    endpoint = endpoint; // keep undefined; will fail and trigger UI fallback
    console.warn('getServiceMetadata failed, using default model:', model);
  }

  console.log('Service provider:', provider);
  console.log('Service endpoint:', endpoint);
  console.log('Service model:', model);

  // Prepare messages
  const messages = [{ role: "user", content: prompt }];

  // Generate headers
  let headers = {};
  try {
    headers = await b.inference.getRequestHeaders(provider, messages);
  } catch (e) {
    console.warn('getRequestHeaders failed, continuing with zminimal headers:', e?.message);
  }

  // Send request
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify({
      messages,
      model
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Request failed:', response.status, errorText);
    throw new Error(`Request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const answer = data.choices[0].message.content;
  const chatID = data.id;

  // Verify response
  try {
    await b.inference.processResponse(provider, answer, chatID);
  } catch (e) {
    console.warn('Response verification skipped:', e);
  }

  return answer;
}

// Get balance
async function getBalance() {
  const b = await initBroker();
  const account = await b.ledger.getLedger();
  return ethers.formatEther(account.totalBalance);
}

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Compute-ready endpoints for plug-and-play when network is back
app.get('/api/compute/services', async (_req, res) => {
  try {
    const b = await initBroker();
    const services = await b.inference.listService();
    const normalized = services.map(s => JSON.parse(JSON.stringify(s, (k, v) => typeof v === 'bigint' ? v.toString() : v)));
    res.json({ services: normalized });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to list services' });
  }
});

app.get('/api/compute/provider/:address/metadata', async (req, res) => {
  try {
    const b = await initBroker();
    const { address } = req.params;
    const meta = await b.inference.getServiceMetadata(address);
    const normalized = JSON.parse(JSON.stringify(meta, (k, v) => typeof v === 'bigint' ? v.toString() : v));
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to get metadata' });
  }
});

app.post('/api/compute/ack', async (req, res) => {
  try {
    const b = await initBroker();
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Provider address is required' });
    await b.inference.acknowledgeProviderSigner(address);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to acknowledge provider' });
  }
});

app.post('/api/compute/inference', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '');
    const provider = req.body?.provider;
    if (!prompt) { return res.status(400).json({ error: 'Prompt is required' }); }
    const answer = await sendAIRequest(prompt, provider);
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Compute inference failed' });
  }
});

app.get('/api/balance', async (_req, res) => {
  try {
    const balance = await getBalance();
    res.json({ balance });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to get balance' });
  }
});

app.get('/api/wallet', async (_req, res) => {
  try {
    const rpcUrl = process.env.ZEROG_RPC_URL || process.env.VITE_ZEROG_RPC_URL || "https://evmrpc-testnet.0g.ai";
    const privateKey = process.env.VITE_ZEROG_PRIVATE_KEY || process.env.ZEROG_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!privateKey) {
      return res.status(500).json({ error: 'Private key not configured' });
    }
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    res.json({ address: wallet.address });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to get wallet address' });
  }
});

app.get('/api/ledger', async (_req, res) => {
  try {
    const b = await initBroker();
    const info = await b.ledger.getLedger();
    const normalized = JSON.parse(JSON.stringify(info, (k, v) => typeof v === 'bigint' ? v.toString() : v));
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to get ledger info' });
  }
});

app.post('/api/ledger/fund', async (req, res) => {
  try {
    const amountStr = String(req.body?.amount || '').trim();
    if (!amountStr) {
      return res.status(400).json({ error: 'amount is required (e.g., "1" for 1.0 OG)' });
    }

    const b = await initBroker();
    let funded = false;

    // Try funding using wei BigInt (parseEther)
    try {
      const amountWei = ethers.parseEther(amountStr);
      await b.ledger.addLedger(amountWei);
      funded = true;
    } catch (e) {
      // Fallback: try plain number if SDK expects token units
      try {
        await b.ledger.addLedger(Number(amountStr));
        funded = true;
      } catch (e2) {
        return res.status(500).json({ error: e2?.message || 'Failed to fund ledger' });
      }
    }

    const info = await b.ledger.getLedger();
    const normalized = JSON.parse(JSON.stringify(info, (k, v) => typeof v === 'bigint' ? v.toString() : v));
    res.json({ ok: funded, ledger: normalized });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to fund ledger' });
  }
});

app.post('/api/ledger/transfer', async (req, res) => {
  try {
    const b = await initBroker();
    const providerAddr = String(req.body?.provider || '').trim();
    const serviceType = String(req.body?.serviceType || 'inference');
    const amountStr = String(req.body?.amount || '').trim();

    if (!providerAddr) {
      return res.status(400).json({ error: 'provider is required' });
    }
    if (!amountStr) {
      return res.status(400).json({ error: 'amount is required (e.g., "1" for 1.0 OG)' });
    }

    let amount;
    try {
      amount = ethers.parseEther(amountStr);
    } catch (_e) {
      amount = BigInt(amountStr);
    }

    await b.ledger.transferFund(providerAddr, serviceType, amount);

    const info = await b.ledger.getLedger();
    const normalized = JSON.parse(JSON.stringify(info, (k, v) => typeof v === 'bigint' ? v.toString() : v));

    res.json({ ok: true, transferred: amount.toString(), serviceType, provider: providerAddr, ledger: normalized });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to transfer to provider subaccount' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '');
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Express /api/chat called with prompt:', prompt);

    try {
      const answer = await sendAIRequest(prompt);
      console.log('Express /api/chat success:', answer);
      res.json({ answer });
    } catch (aiError) {
      console.warn('Express /api/chat: 0G Compute failed, returning fallback response:', aiError?.message);

      const fallbackResponse = {
        severity: 'moderate',
        confidence: 0.6,
        summary: `Traffic analysis temporarily unavailable. Using basic traffic data.`,
        recommendations: [
          'Check real-time traffic updates before departure',
          'Consider alternative routes if available',
          'Allow extra time for your journey'
        ],
        predictedCongestion: 45,
        bestTimeToTravel: 'Current time is optimal for travel',
        alternativeRoutesSuggestion: 'Consider checking alternative routes for better traffic conditions',
        estimatedDelay: 5
      };

      console.log('Express /api/chat: Returning fallback response');
      res.json({ answer: JSON.stringify(fallbackResponse) });
    }
  } catch (error) {
    console.error('Express /api/chat: Unexpected error:', error);
    res.status(500).json({ error: error?.message || 'Chat failed' });
  }
});

app.post('/api/qwen', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '');
    const answer = await sendAIRequest(prompt, '0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3');
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Qwen failed' });
  }
});

app.post('/api/llama', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '');
    const answer = await sendAIRequest(prompt, '0xf07240Efa67755B5311bc75784a061eDB47165Dd');
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Llama failed' });
  }
});

// Save traffic data to 0G Storage
app.post('/api/storage/save', async (req, res) => {
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ error: 'Data is required' });
  }

  // Queue this upload to prevent nonce conflicts
  uploadQueue = uploadQueue.then(async () => {
    try {
      // Import 0G Storage dynamically
      const { ZgFile, Indexer } = await import('@0glabs/0g-ts-sdk');

      const RPC_URL = process.env.ZEROG_RPC_URL || process.env.VITE_ZEROG_RPC_URL || 'https://evmrpc-testnet.0g.ai/';
      const INDEXER_RPC = process.env.ZEROG_INDEXER_RPC || process.env.VITE_0G_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai';
      const privateKey = process.env.ZEROG_PRIVATE_KEY || process.env.VITE_ZEROG_PRIVATE_KEY || process.env.PRIVATE_KEY;

      if (!privateKey) {
        throw new Error('Storage private key not configured');
      }

      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const signer = new ethers.Wallet(privateKey, provider);
      const indexer = new Indexer(INDEXER_RPC);

      const jsonData = JSON.stringify(data, null, 2);
      const fileName = `traffic-${Date.now()}.json`;
      const filePath = `/tmp/${fileName}`;

      // Write to temp file
      const { writeFileSync } = await import('fs');
      writeFileSync(filePath, jsonData);

      const file = await ZgFile.fromFilePath(filePath);
      const [tree, treeErr] = await file.merkleTree();

      if (treeErr) {
        await file.close();
        throw new Error(`Merkle tree error: ${treeErr}`);
      }

      const [tx, uploadErr] = await indexer.upload(file, RPC_URL, signer);

      if (uploadErr) {
        await file.close();
        throw new Error(`Upload error: ${uploadErr}`);
      }

      await file.close();

      const result = {
        rootHash: tree?.rootHash() || '',
        txHash: tx || '',
        timestamp: new Date().toISOString()
      };

      // Save metadata to centralized database
      const metadata = storageDB.addMetadata({
        rootHash: result.rootHash,
        txHash: result.txHash,
        timestamp: result.timestamp,
        dataType: data.type || 'unknown',
        description: `${data.type || 'Data'} - ${new Date().toLocaleString()}`,
        metadata: {
          count: data.count,
          destination: data.destination,
          routeCount: data.routes?.length
        }
      });

      console.log('✅ Saved to 0G Storage:', result);
      return { ...result, id: metadata.id };

    } catch (error) {
      console.error('Storage save failed:', error);
      throw error;
    }
  }).catch(err => {
    // Catch to prevent queue from breaking
    console.error('Queue error:', err);
    throw err;
  });

  try {
    const result = await uploadQueue;
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Storage save failed' });
  }
});

// Get all storage metadata
app.get('/api/storage/metadata', async (req, res) => {
  try {
    const stats = storageDB.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Failed to get metadata:', error);
    res.status(500).json({ error: error?.message || 'Failed to get metadata' });
  }
});

// Export all metadata for AI training
app.get('/api/storage/export', async (req, res) => {
  try {
    const data = storageDB.exportAll();
    res.json(data);
  } catch (error) {
    console.error('Failed to export metadata:', error);
    res.status(500).json({ error: error?.message || 'Failed to export' });
  }
});

// Download data from 0G Storage
app.get('/api/storage/download/:rootHash', async (req, res) => {
  try {
    const { rootHash } = req.params;
    if (!rootHash) {
      return res.status(400).json({ error: 'Root hash is required' });
    }

    const { Indexer } = await import('@0glabs/0g-ts-sdk');
    const INDEXER_RPC = 'https://indexer-storage-testnet-turbo.0g.ai';

    const indexer = new Indexer(INDEXER_RPC);
    const outputPath = `/tmp/download-${rootHash.slice(0, 10)}.json`;

    const err = await indexer.download(rootHash, outputPath, true);
    if (err) {
      return res.status(500).json({ error: `Download error: ${err}` });
    }

    // Read and return the file
    const { readFileSync } = await import('fs');
    const data = readFileSync(outputPath, 'utf-8');
    const parsed = JSON.parse(data);

    console.log('✅ Downloaded from 0G Storage:', rootHash);
    res.json(parsed);

  } catch (error) {
    console.error('Storage download failed:', error);
    res.status(500).json({ error: error?.message || 'Download failed' });
  }
});

app.get('/api/compute/train/log', async (req, res) => {
  try {
    const file = String(req.query?.file || '');
    if (!file) {
      return res.status(400).json({ error: 'Log file path is required' });
    }
    const path = await import('path');
    const fs = await import('fs');
    const logsDir = path.join(process.cwd(), 'cli-output');
    const resolved = path.resolve(file);
    if (!resolved.startsWith(logsDir)) {
      return res.status(400).json({ error: 'Invalid log file path' });
    }
    const content = fs.readFileSync(resolved, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to read log file' });
  }
});

app.post('/api/compute/train/traffic', async (req, res) => {
  try {
    const body = req.body || {};
    const model = String(body.model || 'distilbert-base-uncased');
    const provider = String(body.provider || '');
    const dataset = body.dataset || { train: [], validation: [] };

    if (!provider) return res.status(400).json({ error: 'Provider address is required' });
    if ((!dataset.train || dataset.train.length === 0) && (!dataset.validation || dataset.validation.length === 0)) {
      return res.status(400).json({ error: 'Dataset is empty: provide train or validation examples' });
    }

    const path = await import('path');
    const fs = await import('fs');
    const { spawn, spawnSync } = await import('child_process');

    const key = String(body.key || process.env.ZEROG_PRIVATE_KEY || process.env.VITE_ZEROG_PRIVATE_KEY || process.env.PRIVATE_KEY || '');
    const rpc = process.env.ZEROG_RPC_URL || process.env.VITE_ZEROG_RPC_URL || 'https://evmrpc-testnet.0g.ai';
    const ledgerCa = process.env.ZEROG_LEDGER_CA || process.env.LEDGER_CA || '';
    const ftCa = process.env.ZEROG_FINE_TUNE_CA || process.env.FINE_TUNING_CA || '';
    if (!key) return res.status(400).json({ error: 'Server key not configured' });

    const logsDir = path.join(process.cwd(), 'cli-output');
    try { fs.mkdirSync(logsDir, { recursive: true }); } catch {}
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logsDir, `train-traffic-${model}-${ts}.txt`);

    // 1) Build dataset files
    const docsDir = path.join(process.cwd(), 'docs', 'model-usage');
    const bundleName = `traffic-bundle-${Date.now()}`;
    const stagingDir = path.join(docsDir, bundleName);
    try { fs.mkdirSync(stagingDir, { recursive: true }); } catch {}

    const toJsonl = (arr) => (arr || []).map(x => JSON.stringify({ text: String(x?.text || ''), label: Number(x?.label || 0) })).join('\n') + '\n';
    fs.writeFileSync(path.join(stagingDir, 'train.jsonl'), toJsonl(dataset.train));
    fs.writeFileSync(path.join(stagingDir, 'validation.jsonl'), toJsonl(dataset.validation));

    // 2) Zip the dataset bundle
    const outputZip = path.join(docsDir, `traffic-usage-${Date.now()}.zip`);
    const zipProc = spawnSync('zip', ['-q', '-r', outputZip, bundleName], { cwd: docsDir });
    if (zipProc.status !== 0) {
      fs.writeFileSync(logFile, [
        '=== zip ===', zipProc.stderr?.toString() || 'Zip failed'
      ].join('\n\n'));
      return res.status(500).json({ error: 'Failed to create dataset zip' });
    }

    // 3) Calculate tokens
    const scriptPath = path.join(process.cwd(), 'scripts', 'token-count.mjs');
    const datasetDir = stagingDir;
    const calcProc = spawn('node', [scriptPath, datasetDir], { env: { ...process.env }, stdio: ['ignore','pipe','pipe'] });
    let calcOut = '', calcErr = '';
    await new Promise((resolve) => {
      calcProc.stdout.on('data', d => { calcOut += d.toString(); });
      calcProc.stderr.on('data', d => { calcErr += d.toString(); });
      calcProc.on('close', () => resolve());
    });
    const tokenMatch = (calcOut + calcErr).match(/Approximate token count:\s*(\d+)/i);
    const tokenCount = tokenMatch ? Number(tokenMatch[1]) : undefined;
    const dataSize = Number((body.dataSize ?? tokenCount ?? 1));

    // 4) Upload dataset using 0G TS SDK with nonce-safe retry
    let datasetHash = '';
    let uploadTx = '';
    try {
      const { ZgFile, Indexer } = await import('@0glabs/0g-ts-sdk');
      const { ethers } = await import('ethers');
      let providerEvm = new ethers.JsonRpcProvider(rpc);
      let signer = new ethers.Wallet(key, providerEvm);
      const INDEXER_RPC = process.env.ZEROG_INDEXER_RPC || process.env.VITE_0G_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai';
      const indexer = new Indexer(INDEXER_RPC);
      const file = await ZgFile.fromFilePath(outputZip);
      const [tree, treeErr] = await file.merkleTree();
      if (treeErr) { await file.close(); throw new Error(`Merkle tree error: ${treeErr}`); }

      // Retry upload to bypass transient nonce conflicts
      let lastErr = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const [tx, uploadErr] = await indexer.upload(file, rpc, signer);
        uploadTx = tx || '';
        if (!uploadErr) { lastErr = null; break; }
        lastErr = uploadErr;
        const msg = String(uploadErr || '');
        if (/nonce too low|NONCE_EXPIRED/i.test(msg)) {
          await new Promise((r) => setTimeout(r, 2000));
          providerEvm = new ethers.JsonRpcProvider(rpc);
          signer = new ethers.Wallet(key, providerEvm);
          continue;
        } else {
          await file.close();
          throw new Error(`Upload error: ${uploadErr}`);
        }
      }
      if (lastErr) { await file.close(); throw new Error(`Upload error: ${lastErr}`); }
      await file.close();
      datasetHash = tree?.rootHash() || '';
    } catch (e) {
      fs.writeFileSync(logFile, [
        '=== calculate-token ===', calcOut, calcErr,
        '=== upload ===', e?.stack || e?.message || String(e)
      ].join('\n\n'));
      return res.status(500).json({ error: e?.message || 'Dataset upload failed' });
    }
    if (!datasetHash) {
      fs.writeFileSync(logFile, [
        '=== calculate-token ===', calcOut, calcErr,
        '=== upload ===', `Tx: ${uploadTx}`
      ].join('\n\n'));
      return res.status(500).json({ error: 'Dataset upload failed' });
    }

    // 5) Create fine-tuning task
    const configPath = path.join(process.cwd(), 'docs', 'model-usage', 'distilbert-base-uncased', 'config.template.json');
    const cliPath = path.join(process.cwd(), 'node_modules', '@0glabs', '0g-serving-broker', 'cli.commonjs', 'cli', 'index.js');
    const run = (cliArgs) => new Promise((resolve) => {
      const p = spawn('node', [cliPath, ...cliArgs], { env: { ...process.env }, stdio: ['ignore','pipe','pipe'] });
      let out = ''; let err = '';
      p.stdout.on('data', d => { out += d.toString(); });
      p.stderr.on('data', d => { err += d.toString(); });
      p.on('close', (code) => resolve({ code, out, err }));
    });

    const createArgs = ['create-task','--key', key,'--provider', provider,'--model', model,'--rpc', rpc];
    createArgs.push('--data-size', String(dataSize));
    if (datasetHash) createArgs.push('--dataset', datasetHash);
    if (configPath) createArgs.push('--config-path', configPath);
    if (ledgerCa) createArgs.push('--ledger-ca', ledgerCa);
    if (ftCa) createArgs.push('--fine-tuning-ca', ftCa);
    const created = await run(createArgs);

    fs.writeFileSync(logFile, [
      '=== calculate-token ===', calcOut, calcErr,
      '=== upload ===', `Root: ${datasetHash}`, `Tx: ${uploadTx}`,
      '=== create-task ===', created.out, created.err
    ].join('\n\n'));

    res.json({
      ok: created.code === 0,
      tokenCount,
      datasetHash,
      logFile,
      outputs: {
        calculateToken: calcOut || calcErr,
        upload: `Root: ${datasetHash}\nTx: ${uploadTx}`,
        createTask: created.out || created.err
      }
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Traffic training task failed' });
  }
});

app.listen(PORT, () => {
  const hasPk = !!(process.env.PRIVATE_KEY || process.env.ZEROG_PRIVATE_KEY || process.env.VITE_ZEROG_PRIVATE_KEY);
  const hasRpc = !!(process.env.ZEROG_RPC_URL || process.env.VITE_ZEROG_RPC_URL);
  console.log(`0G server listening on :${PORT} (key:${hasPk}, rpc:${hasRpc})`);

  // Eagerly initialize 0G broker for plug-and-play readiness
  initBroker().then(async (b) => {
    try {
      const services = await b.inference.listService();
      console.log(`🔎 Discovered ${services?.length || 0} compute services`);
    } catch (e) {
      console.warn('Compute service discovery failed (will retry on demand):', e?.message);
    }
  }).catch((e) => {
    console.warn('0G broker init failed at startup (will init on demand):', e?.message);
  });
});
