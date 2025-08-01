#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import { diffLines } from 'diff'
import { run as runSpec } from '../src/run.mjs'
import { request } from 'undici'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const REPORTS_DIR = path.join(ROOT, 'reports')
const dateStamp = new Date().toISOString().split('T')[0]

/* ---------- load manifest ---------- */
const brdList = yaml.load(readFileSync(path.join(ROOT, 'brd-list.yml'), 'utf8'))

/* ---------- ensure reports dir ---------- */
mkdirSync(REPORTS_DIR, { recursive: true })

const summary = []

for (const { file } of brdList) {
  const brdPath = path.join(ROOT, file)
  const brdName = path.basename(file, '.md')
  const prevPath = path.join(REPORTS_DIR, `${brdName}-latest.md`)
  const diffPath = path.join(REPORTS_DIR, `${brdName}-${dateStamp}-diff.md`)

  const brdString = readFileSync(brdPath, 'utf8')
  const newSpecPath = await runSpec(brdString)

  /* ---------- diff against previous if it exists ---------- */
  if (existsSync(prevPath)) {
    const oldSpec = readFileSync(prevPath, 'utf8')
    const newSpec = readFileSync(newSpecPath, 'utf8')
    const diff = diffLines(oldSpec, newSpec)
      .map(p =>
        p.added ? `+ ${p.value}` :
        p.removed ? `- ${p.value}` :
        `  ${p.value}`
      )
      .join('')
    writeFileSync(diffPath, diff)
    summary.push(`• **${brdName}** – updated, diff saved to ${path.relative(ROOT, diffPath)}`)
  } else {
    summary.push(`• **${brdName}** – first run, no diff`)
  }

  /* ---------- copy new spec as latest ---------- */
  writeFileSync(prevPath, readFileSync(newSpecPath))
}

/* ---------- Slack/Lark webhook (optional) ---------- */
const HOOK = process.env.SLACK_WEBHOOK_URL || process.env.LARK_WEBHOOK_URL
if (HOOK && summary.length) {
  await request(HOOK, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: `Nightly Intel – ${dateStamp}\n` + summary.join('\n') })
  })
}

console.log('Nightly run complete:\n' + summary.join('\n'))

