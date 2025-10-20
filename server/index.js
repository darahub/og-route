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
    console.warn('getRequestHeaders failed, continuing with minimal headers:', e?.message);
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
    res.json({ services });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to list services' });
  }
});

app.get('/api/compute/provider/:address/metadata', async (req, res) => {
  try {
    const b = await initBroker();
    const { address } = req.params;
    const meta = await b.inference.getServiceMetadata(address);
    res.json(meta);
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

app.post('/api/compute/train', async (req, res) => {
  try {
    const body = req.body || {};
    const model = String(body.model || 'distilbert-base-uncased');
    const provider = String(body.provider || '');
    const path = await import('path');
    const datasetZipPath = String(body.datasetZipPath || path.join(process.cwd(), 'docs', 'model-usage', 'distilbert-usage.zip'));
    const configPath = String(body.configPath || path.join(process.cwd(), 'docs', 'model-usage', 'distilbert-base-uncased', 'config.template.json'));

    const { spawn } = await import('child_process');
    const fs = await import('fs');

    const key = process.env.ZEROG_PRIVATE_KEY || process.env.VITE_ZEROG_PRIVATE_KEY || process.env.PRIVATE_KEY;
    const rpc = process.env.ZEROG_RPC_URL || process.env.VITE_ZEROG_RPC_URL || 'https://evmrpc-testnet.0g.ai';
    const ledgerCa = process.env.ZEROG_LEDGER_CA || process.env.LEDGER_CA || '';
    const ftCa = process.env.ZEROG_FINE_TUNE_CA || process.env.FINE_TUNING_CA || '';

    if (!key) return res.status(400).json({ error: 'Server key not configured' });
    if (!provider) return res.status(400).json({ error: 'Provider address is required' });

    const logsDir = path.join(process.cwd(), 'cli-output');
    try { fs.mkdirSync(logsDir, { recursive: true }); } catch {}

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logsDir, `train-${model}-${ts}.txt`);

    const run = (cliArgs) => new Promise((resolve) => {
      const p = spawn('npx', ['-y', '0g-compute-cli', ...cliArgs], { env: { ...process.env }, stdio: ['ignore','pipe','pipe'] });
      let out = ''; let err = '';
      p.stdout.on('data', d => { out += d.toString(); });
      p.stderr.on('data', d => { err += d.toString(); });
      p.on('close', (code) => resolve({ code, out, err }));
    });

    // 1) Calculate tokens
    const calcArgs = ['calculate-token','--key', key,'--model', model,'--dataset-path', datasetZipPath,'--provider', provider];
    const calc = await run(calcArgs);
    const tokenMatch = (calc.out + calc.err).match(/tokens?:\s*(\d+)/i);
    const tokenCount = tokenMatch ? Number(tokenMatch[1]) : undefined;

    // 2) Upload dataset to 0G storage via CLI
    const uploadArgs = ['upload','--data-path', datasetZipPath,'--key', key,'--rpc', rpc];
    if (ledgerCa) uploadArgs.push('--ledger-ca', ledgerCa);
    if (ftCa) uploadArgs.push('--fine-tuning-ca', ftCa);
    const upload = await run(uploadArgs);
    const hashMatch = (upload.out + upload.err).match(/hash:\s*([0-9a-fx]+)/i);
    const datasetHash = hashMatch ? hashMatch[1] : undefined;

    // 3) Create fine-tuning task
    const createArgs = ['create-task','--key', key,'--provider', provider,'--model', model,'--rpc', rpc];
    if (tokenCount) createArgs.push('--data-size', String(tokenCount));
    if (datasetHash) createArgs.push('--dataset', datasetHash);
    if (configPath) createArgs.push('--config-path', configPath);
    if (ledgerCa) createArgs.push('--ledger-ca', ledgerCa);
    if (ftCa) createArgs.push('--fine-tuning-ca', ftCa);
    const created = await run(createArgs);

    fs.writeFileSync(logFile, [
      '=== calculate-token ===', calc.out, calc.err,
      '=== upload ===', upload.out, upload.err,
      '=== create-task ===', created.out, created.err
    ].join('\n\n'));

    res.json({
      ok: created.code === 0,
      tokenCount,
      datasetHash,
      logFile,
      outputs: {
        calculateToken: calc.out || calc.err,
        upload: upload.out || upload.err,
        createTask: created.out || created.err
      }
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Training task failed' });
  }
});
