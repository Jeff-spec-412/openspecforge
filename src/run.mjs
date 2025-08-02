import { mkdirSync, readFileSync, readdirSync } from 'fs'
import path from 'path'
import { retrieve } from './retriever/index.mjs'
import { gradeSection } from './eval/index.mjs'
import { assemble } from './assemble/index.mjs'
import client from 'prom-client'
import { upsertCitations } from './cache/qdrant.js'
import { fileURLToPath, pathToFileURL } from 'url'
import 'dotenv/config'

const specCounter = new client.Counter({
  name: 'spec_requests_total',
  help: 'Total successful spec generations'
})

const latencyHist = new client.Histogram({
  name: 'spec_latency_seconds',
  help: 'End‑to‑end generation latency',
  buckets: [1, 3, 5, 10, 20, 30, 60]
})

export async function run (brdString, promptsDir = 'src/prompts') {
  const timer = latencyHist.startTimer()

  const templates = readdirSync(promptsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(path.join(promptsDir, f), 'utf8')))

  const outDir = path.join('runs', Date.now().toString())
  mkdirSync(outDir, { recursive: true })

  const sections = []
  for (const tpl of templates) {
    let limit = 5
    let score = 0
    let filled = ''

    while (score < 80 && limit <= 15) {
      const citations = await retrieve(brdString.split('\n')[0], limit)
      upsertCitations(citations).catch(() => {})

      filled = tpl.template
        .replace('{{brd}}', brdString)
        .replace('{{citations}}', citations.map(c => c.url).join('\n'))

      score = await gradeSection(filled)
      if (score < 80) limit += 5
    }
    if (score < 80) throw new Error(`Section "${tpl.section}" failed eval`)

    sections.push({ title: tpl.section, body: filled })
  }

  const { mdPath } = assemble(sections, outDir)
  timer()
  specCounter.inc()
  return mdPath
}

/* ---------- CLI usage (safe URL check) ---------- */
const argvURL = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === argvURL) {
  const [, , file] = process.argv
  if (!file) {
    console.error('usage: node src/run.mjs <brd.md | ->')
    process.exit(1)
  }
  if (file === '-') {
    let data = ''
    process.stdin.on('data', c => (data += c))
    process.stdin.on('end', async () => {
      const p = await run(data)
      console.log('spec at', p)
    })
  } else {
    const brd = readFileSync(file, 'utf8')
    run(brd).then(p => console.log('spec at', p))
  }
}

