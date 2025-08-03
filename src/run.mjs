import { mkdirSync, writeFileSync } from 'fs';
import path  from 'path';
import { generatePRD } from './orchestrator/index.mjs';
import client from 'prom-client';
import 'dotenv/config';

/* ── Prom metrics ── */
const specCounter = new client.Counter({
  name: 'spec_requests_total',
  help: 'Total successful spec generations'
});

/* ── Main ── */
export async function run(brdString) {
  const markdown = await generatePRD(brdString);

  const dir = path.join('runs', Date.now().toString());
  mkdirSync(dir, { recursive: true });
  const mdPath = path.join(dir, 'spec.md');
  writeFileSync(mdPath, markdown);

  specCounter.inc();
  return mdPath;
}

/* CLI helper */
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , file] = process.argv;
  if (!file) return console.error('usage: node src/run.mjs <brd.md>');
  const brd = file === '-' ? await new Promise(r => process.stdin.on('data',c=>r(c.toString())))
                           : require('fs').readFileSync(file,'utf8');
  const p = await run(brd);
  console.log('spec at', p);
}

