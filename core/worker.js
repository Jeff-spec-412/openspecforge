import 'dotenv/config';
import client from 'prom-client';
import express from 'express';
import readline from 'readline';
import { generateSpec } from './pipeline.js';

const counter = new client.Counter({ name: 'osf_requests_total', help: 'total specs requested' });
client.collectDefaultMetrics();

const app = express();
app.get('/metrics', async (_, res) => res.type('text/plain').send(await client.register.metrics()));
app.listen(9464, () => console.log('metrics on :9464 (worker alive)'));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'spec> ' });
rl.prompt();
rl.on('line', async line => {
  const prompt = line.trim();
  if (!prompt) { rl.prompt(); return; }
  counter.inc();
  const { markdown, qaScore } = await generateSpec(prompt);
  console.log(`\nQA ${qaScore}\n${markdown.slice(0,120)}...\n`);
  rl.prompt();
});
