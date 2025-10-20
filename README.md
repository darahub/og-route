# OG Route

Traffic analysis and routing app powered by 0G’s decentralized compute and storage.

This README covers how to run the project locally and, importantly, how to train the traffic model using the new training endpoint and UI.

## Quick Start

- Install dependencies: `npm install`
- Environment variables (local):
  - `PORT=4000` (backend)
  - `VITE_API_URL=http://localhost:4000`
  - `VITE_ZEROG_PRIVATE_KEY=<your_wallet_private_key>`
  - Optional chain settings:
    - `ZEROG_RPC_URL=https://evmrpc-testnet.0g.ai`
    - `ZEROG_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai`
- Run backend: `npm run server`
- Run frontend: `npm run dev`
- Open the app: `http://localhost:5175/`

## Training the Traffic Model

You can train a small classifier on 0G using either the UI or a direct API call. Training prepares a dataset, uploads it to 0G Storage, and creates a fine‑tuning task via the 0G Serving Broker.

### Option A: Train from the UI

- Open the app and use the “Train Traffic Model” modal.
- Fill in:
  - `Provider Address` (your 0G provider wallet address)
  - `Model Name` (default: `distilbert-base-uncased`)
  - `Train Size` and `Validation Size`
- Click `Start Training`.
- Use the `Watch status` button to monitor provider state.

### Option B: Train via API

Send a POST to the backend training endpoint with a small dataset:

```
POST /api/compute/train/traffic
Content-Type: application/json
{
  "provider": "0xYourProviderAddress",
  "model": "distilbert-base-uncased",
  "dataset": {
    "train": [ { "text": "Traffic is jammed on highway at 5pm", "label": 1 } ],
    "validation": [ { "text": "Open roads near downtown", "label": 0 } ]
  }
}
```

Example curl:

```
curl -X POST http://localhost:4000/api/compute/train/traffic \
  -H "Content-Type: application/json" \
  -d '{
    "provider":"0xYourProviderAddress",
    "model":"distilbert-base-uncased",
    "dataset":{
      "train":[{"text":"Traffic is jammed on highway heading north at 5pm","label":1},{"text":"Open roads early in the morning near downtown","label":0}],
      "validation":[{"text":"Rush hour causes delays on main street","label":1}]
    }
  }'
```

The response includes:
- `ok`: training task creation status
- `tokenCount`: approximate token count in the dataset
- `datasetHash`: 0G Storage root hash
- `logFile`: path to the full training logs

### What Happens Under the Hood

The backend route `POST /api/compute/train/traffic` performs:
- Build dataset files (`train.jsonl`, `validation.jsonl`) under `docs/model-usage/traffic-bundle-<timestamp>/`.
- Zip the dataset bundle to `docs/model-usage/traffic-usage-<timestamp>.zip`.
- Calculate tokens using `scripts/token-count.mjs`.
- Upload to 0G Storage via `@0glabs/0g-ts-sdk` with a nonce‑safe retry (handles transient `nonce too low` / `NONCE_EXPIRED` errors).
- Create a fine‑tuning task via `@0glabs/0g-serving-broker` CLI.
- Write detailed logs to `cli-output/train-traffic-<model>-<timestamp>.txt`.

### Monitoring & Logs

- Tail training logs: `tail -f cli-output/train-traffic-<model>-<timestamp>.txt`
- Watch provider status via the UI button in the training modal.

### Troubleshooting

- Proxy errors in the frontend: ensure the backend is running on `PORT=4000` and `VITE_API_URL` points to it.
- Nonce conflicts during upload: the server auto‑retries. If it persists, restart the backend or increase delay in the retry section.
- Node module type warnings: add `"type": "module"` to `package.json` if you prefer ESM consistently.

## 0G Integration Overview

- Compute: `@0glabs/0g-serving-broker` for inference and fine‑tuning tasks
- Storage: `@0glabs/0g-ts-sdk` for uploading datasets and retrieving via root hash
- RPC: `https://evmrpc-testnet.0g.ai`
- Indexer: `https://indexer-storage-testnet-turbo.0g.ai`

## Documentation

- Third Wave summary: `3RD_WAVE.md`
- Fourth Wave (training-focused improvements): `4TH_WAVE.md`
- Deployment details: `DEPLOYMENT.md`

## 0G Integration Files

- Compute (backend): `server/index.js` – broker initialization, `/api/chat` route, and compute helpers using `@0glabs/0g-serving-broker`.
- Compute (frontend): `src/services/0gComputeService.ts` – broker initialization and traffic analysis requests.
- Training (backend): `server/index.js` – `POST /api/compute/train/traffic` for dataset build, token counting, 0G Storage upload with nonce‑safe retry, and fine‑tuning task creation via 0G Serving Broker CLI.
- Training utilities: `scripts/token-count.mjs` for token estimation; config template at `docs/model-usage/distilbert-base-uncased/config.template.json`.
- Storage (backend): `server/index.js` – `/api/storage/save`, `/api/storage/download/:rootHash`, `/api/storage/metadata` endpoints using `@0glabs/0g-ts-sdk`.
- Storage (frontend): `src/services/0gStorageService.ts` for upload/download; `src/services/storageMetadata.ts` for local indexing of stored data.
- Serverless proxies (Vercel): `api/chat.ts`, `api/storage/save.ts`, `api/storage/metadata.ts` – thin routing to the backend API.