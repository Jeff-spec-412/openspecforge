#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path  from 'path';
import yaml  from 'js-yaml';
import { diffLines } from 'diff';
import { run as runSpec } from '../src/run.mjs';
import { request } from 'undici';
import 'dotenv/config';

/* ---------- constants ---------- */
const ROOT        = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const REPORTS_DIR = path.join(ROOT, 'reports');
const dateStamp   = new Date().toISOString().split('T')[0];

/* ---------- load manifest ---------- */
const brdList = yaml.load(readFileSync(path.join(ROOT, 'brd-list.yml'), 'utf8'));

/* ---------- ensure dir ---------- */
mkdirSync(REPORTS_DIR, { recursive: true });

const summary = [];

for (const { file } of brdList) {
  const brdPath  = path.join(ROOT, file);
  const brdName  = path.basename(file, '.md');
  const prevPath = path.join(REPORTS_DIR, `${brdName}-latest.md`);
  const diffPath = path.join(REPORTS_DIR, `${brdName}-${dateStamp}-diff.md`);

  const newMdPath = await runSpec(readFileSync(brdPath, 'utf8'));
  const newMd     = readFileSync(newMdPath, 'utf8');

  /* ---------- diff ---------- */
  if (existsSync(prevPath)) {
    const oldMd = readFileSync(prevPath, 'utf8');
    const diff  = diffLines(oldMd, newMd)
      .map(p => p.added   ? `+ ${p.value}`
               : p.removed? `- ${p.value}`
               : `  ${p.value}`)
      .join('');
    writeFileSync(diffPath, diff);
    summary.push(`• **${brdName}** – updated, diff saved to ${path.relative(ROOT, diffPath)}`);
  } else {
    summary.push(`• **${brdName}** – first run, no diff`);
  }

  /* ---------- save latest ---------- */
  writeFileSync(prevPath, newMd);
}

/* ---------- optional webhook ---------- */
const HOOK = process.env.SLACK_WEBHOOK_URL || process.env.LARK_WEBHOOK_URL;
if (HOOK && summary.length) {
  await request(HOOK, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: `Nightly Intel – ${dateStamp}\n` + summary.join('\n') })
  });
}

console.log('Nightly run complete:\n' + summary.join('\n'));

