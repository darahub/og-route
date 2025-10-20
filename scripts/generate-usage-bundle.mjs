import { mkdirSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const docsDir = join(process.cwd(), 'docs', 'model-usage', 'distilbert-base-uncased');
const datasetsDir = join(process.cwd(), 'datasets', 'distilbert-sample');
const outputZip = join(process.cwd(), 'docs', 'model-usage', 'distilbert-usage.zip');

function ensureDirs() {
  const outDir = join(process.cwd(), 'docs', 'model-usage');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
}

function bundle() {
  ensureDirs();
  // Create a temp staging directory
  const staging = join(process.cwd(), 'docs', 'model-usage', 'distilbert-bundle');
  mkdirSync(staging, { recursive: true });

  // Copy docs
  copyFileSync(join(docsDir, 'README.md'), join(staging, 'README.md'));
  copyFileSync(join(docsDir, 'config.template.json'), join(staging, 'config.template.json'));

  // Copy dataset sample
  copyFileSync(join(datasetsDir, 'train.jsonl'), join(staging, 'train.jsonl'));
  copyFileSync(join(datasetsDir, 'validation.jsonl'), join(staging, 'validation.jsonl'));

  // Zip the bundle
  const zip = spawnSync('zip', ['-q', '-r', outputZip, 'distilbert-bundle'], { cwd: join(process.cwd(), 'docs', 'model-usage') });
  if (zip.status !== 0) {
    console.error('Failed to create zip:', zip.stderr?.toString() || 'unknown error');
    process.exit(1);
  }
  console.log('Created usage bundle:', outputZip);
}

bundle();