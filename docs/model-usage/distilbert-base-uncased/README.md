# DistilBERT Usage Template (Fallback)

This is a fallback usage template for fine-tuning `distilbert-base-uncased` on a simple text classification task (e.g., traffic severity: heavy, moderate, light). Use this if the official `0g-compute-cli model-usage` command is unavailable.

## Dataset Layout

Zip a folder containing JSONL files:

- `train.jsonl` — training examples
- `validation.jsonl` — validation examples

Each line is a JSON object with fields:

```
{"text": "string", "label": "heavy|moderate|light"}
```

Example `train.jsonl`:

```
{"text": "Traffic is heavy on highway 101 due to an accident.", "label": "heavy"}
{"text": "Moderate congestion around downtown during rush hour.", "label": "moderate"}
{"text": "Light traffic on residential streets, smooth flow.", "label": "light"}
```

Example `validation.jsonl`:

```
{"text": "Severe delay reported on I-280, avoid the area.", "label": "heavy"}
{"text": "Minor slowdown near school zone.", "label": "moderate"}
```

## Token Count (Approximation)

If `0g-compute-cli calculate-token` is unavailable, approximate token count by splitting on whitespace and adding ~2 special tokens per example. The count is used for pricing; small deviations are typically acceptable.

## Upload to 0G Storage (Local server)

With the local server running (`node server/index.js`), POST your dataset JSON to `POST /api/storage/save`:

- Body: `{ "data": { "type": "traffic-dataset", "count": <N>, "destination": "distilbert" , "train": [...], "validation": [...] } }`
- Response includes `rootHash` and `txHash`.

Alternatively, upload the zipped dataset by adapting the server to accept binary uploads.

## Fine-Tuning Config

See `config.template.json` for a minimal configuration. Adjust hyperparameters and labels to your data.

## Notes

- This template is a stopgap until the provider’s official usage bundle is available.
- Provider-specific requirements may differ; if the provider later publishes an official template, prefer that.