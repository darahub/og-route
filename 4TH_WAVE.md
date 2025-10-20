# 4th Wave: Training the Traffic Model on 0G

## Overview
This wave focuses on enabling and hardening model training for traffic classification using 0G’s decentralized infrastructure. Building on the 3rd Wave (compute + storage integration), we now provide a clear training path via the UI and a dedicated backend endpoint.

## What We Added
- Backend training route: `POST /api/compute/train/traffic`
- Dataset preparation: generate `train.jsonl` and `validation.jsonl` on the fly
- Token counting: `scripts/token-count.mjs` estimates dataset token size
- 0G Storage upload with nonce-safe retry to handle transient chain nonce conflicts
- Fine-tuning task creation via `@0glabs/0g-serving-broker` CLI
- Detailed logging to `cli-output/train-traffic-<model>-<timestamp>.txt`
- UI path to trigger training through the “Train Traffic Model” modal

## Flow Summary
1. Receive a training request (UI or API).
2. Build JSONL dataset files under `docs/model-usage/traffic-bundle-<timestamp>/`.
3. Zip the dataset bundle: `docs/model-usage/traffic-usage-<timestamp>.zip`.
4. Estimate tokens using `scripts/token-count.mjs`.
5. Upload the bundle to 0G Storage (`@0glabs/0g-ts-sdk`) with retry on `nonce too low` / `NONCE_EXPIRED` errors.
6. Create a fine‑tuning task via `@0glabs/0g-serving-broker` CLI.
7. Persist logs for full visibility.

## API Details
- Endpoint: `POST /api/compute/train/traffic`
- Payload shape:
```
{
  "provider": "0xProviderAddress",
  "model": "distilbert-base-uncased",
  "dataset": {
    "train": [{"text": "...", "label": 1}],
    "validation": [{"text": "...", "label": 0}]
  }
}
```
- Response fields:
  - `ok`: boolean task creation status
  - `tokenCount`: approximate dataset token count
  - `datasetHash`: 0G Storage root hash
  - `logFile`: absolute path to the training log file

## Reliability Improvements
- Implemented nonce‑safe retry around storage uploads to mitigate transient conflicts, significantly reducing `nonce has already been used` failures.
- Re-instantiates the `ethers` provider and signer between retries and waits shortly before re‑attempts.

## Files & Components
- `server/index.js`: training endpoint implementation and retry logic
- `scripts/token-count.mjs`: token estimation utility
- `docs/model-usage/*`: dataset bundles and zipped artifacts
- `cli-output/*`: training logs
- `src/components/*`: training modal triggers and status display

## How to Use
### UI
- Open the app and use the “Train Traffic Model” modal.
- Provide `Provider Address`, set `Model Name` (default `distilbert-base-uncased`), specify `Train Size` and `Validation Size`.
- Click `Start Training` and use `Watch status` to monitor the provider.

### API
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

## Environment
- `PORT=4000`
- `VITE_API_URL=http://localhost:4000`
- `VITE_ZEROG_PRIVATE_KEY=<wallet_private_key>`
- Optional:
  - `ZEROG_RPC_URL=https://evmrpc-testnet.0g.ai`
  - `ZEROG_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai`

## Testing
- Start backend: `npm run server`
- Start frontend: `npm run dev`
- Train via UI or API and verify response (`ok`, `tokenCount`, `datasetHash`).
- Tail logs: `tail -f cli-output/train-traffic-<model>-<timestamp>.txt`.

## Relation to 3rd Wave
- 3rd Wave established core compute and storage integration.
- 4th Wave builds on that foundation by enabling fine‑tuning workflows and adding reliability (nonce retry) to storage uploads.

## Next Steps
- Stream training logs to the UI.
- Add dataset versioning and metadata display in the Storage Viewer.
- Automate evaluation metrics and model registry management.