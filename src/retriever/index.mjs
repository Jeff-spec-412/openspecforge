import { upsertCitations, searchCache } from '../cache/qdrant.js'
import { fetchDuckDuckGo } from './plugins/duckduckgo.mjs'

const loaders = [
  async (q, k) => {
    try { return await fetchDuckDuckGo(q, k) } catch { return [] }
  }
]

export async function retrieve (query, limit = 5) {
  const cached = await searchCache(query, limit)
  if (cached.length >= limit) return cached.slice(0, limit)

  const results = []
  for (const fn of loaders) {
    const fresh = await fn(query, limit).catch(() => [])
    results.push(...fresh)
    if (results.length >= limit) break
  }

  const dedup = []
  const seen  = new Set()
  for (const r of results) {
    if (!seen.has(r.url)) { dedup.push(r); seen.add(r.url) }
    if (dedup.length === limit) break
  }

  upsertCitations(dedup).catch(() => {})
  return dedup.length
    ? dedup
    : [{
        title: 'Placeholder citation',
        url:   'https://example.com',
        snippet: 'Retrieval temporarily unavailable',
        date:  new Date().toISOString().split('T')[0]
      }]
}

