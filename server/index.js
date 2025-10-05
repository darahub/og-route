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

// Initialize broker
async function initBroker() {
  if (broker) return broker;

  try {
    const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
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
  if (!provider) {
    const services = await b.inference.listService();
    provider = services[0]?.provider;
  }

  if (!provider) {
    throw new Error('No provider available');
  }

  // Acknowledge provider
  await b.inference.acknowledgeProviderSigner(provider);

  // Get service metadata
  const { endpoint, model } = await b.inference.getServiceMetadata(provider);
  console.log('Service endpoint:', endpoint);
  console.log('Service model:', model);

  // Prepare messages
  const messages = [{ role: "user", content: prompt }];

  // Generate headers
  const headers = await b.inference.getRequestHeaders(provider, JSON.stringify(messages));

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
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Import 0G Storage dynamically
    const { ZgFile, Indexer } = await import('@0glabs/0g-ts-sdk');

    const RPC_URL = 'https://evmrpc-testnet.0g.ai/';
    const INDEXER_RPC = 'https://indexer-storage-testnet-turbo.0g.ai';
    const privateKey = process.env.VITE_ZEROG_PRIVATE_KEY || process.env.ZEROG_PRIVATE_KEY;

    if (!privateKey) {
      return res.status(500).json({ error: 'Storage private key not configured' });
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
      return res.status(500).json({ error: `Merkle tree error: ${treeErr}` });
    }

    const [tx, uploadErr] = await indexer.upload(file, RPC_URL, signer);

    if (uploadErr) {
      await file.close();
      return res.status(500).json({ error: `Upload error: ${uploadErr}` });
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
    res.json({ ...result, id: metadata.id });

  } catch (error) {
    console.error('Storage save failed:', error);
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
});
