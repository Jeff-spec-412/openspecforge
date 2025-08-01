import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { marked } from 'marked'

export function assemble(blocks, outDir) {
  // blocks = [{ title: 'Problem', body: '…' }, …]
  const md = blocks
    .map(b => `## ${b.title}\n\n${b.body}`)
    .join('\n\n')

  mkdirSync(outDir, { recursive: true })
  const mdPath = path.join(outDir, 'spec.md')
  writeFileSync(mdPath, md)

  // optional HTML conversion (future PDF)
  const htmlPath = path.join(outDir, 'spec.html')
  writeFileSync(htmlPath, marked.parse(md))

  return { mdPath, htmlPath }
}

