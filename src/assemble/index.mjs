/* ────────────────────────────────────────────────────────────
   Assemble module
   • Converts array of {title, body} into markdown & HTML
   • Injects provenance (sha256) footer for audit trace
   ──────────────────────────────────────────────────────────── */

import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { marked } from 'marked'

export function assemble (sections, outDir) {
  mkdirSync(outDir, { recursive: true })

  /* ----- build markdown ----- */
  const fullMd = sections
    .map(s => `## ${s.title}\n\n${s.body}`)
    .join('\n\n')

  const provHash = crypto
    .createHash('sha256')
    .update(fullMd)
    .digest('hex')

  const mdWithProv =
    fullMd + `\n\n---\n_Provenance: sha256:${provHash}_`

  /* ----- write files ----- */
  const mdPath  = path.join(outDir, 'spec.md')
  const htmlPath = path.join(outDir, 'spec.html')

  writeFileSync(mdPath, mdWithProv)
  writeFileSync(htmlPath, marked.parse(mdWithProv))

  return { mdPath, htmlPath, provHash }
}

