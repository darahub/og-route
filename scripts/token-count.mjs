import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function usage() {
  console.log('Usage: node scripts/token-count.mjs <dataset-folder>');
  process.exit(1);
}

const folder = process.argv[2];
if (!folder) usage();

function countTokensInFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split(/\n+/).filter(Boolean);
  let tokens = 0;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const text = String(obj.text || '');
      const words = text.trim() ? text.trim().split(/\s+/) : [];
      // Approximate WordPiece tokenization: assume ~1.3 tokens per word
      tokens += Math.round(words.length * 1.3) + 2; // +2 for special tokens
    } catch (_e) {
      // skip malformed lines
    }
  }
  return tokens;
}

function main() {
  const trainPath = join(folder, 'train.jsonl');
  const valPath = join(folder, 'validation.jsonl');
  let total = 0;
  try { total += countTokensInFile(trainPath); } catch {}
  try { total += countTokensInFile(valPath); } catch {}

  console.log(`Approximate token count: ${total}`);
}

main();