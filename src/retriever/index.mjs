/* ────────────────────────────────────────────────────────────
   Retriever module
   • Caches citations in Qdrant (if running)
   • Supports pluggable loaders  (DuckDuckGo, FMP, Crunchbase…)
   • Adds token‑quota guard‑rail via addTokens()
   ──────────────────────────────────────────────────────────── */

import { upsertCitations, searchCache } from '../cache/qdrant.js'
import { addTokens } from '../guard/usage.js'

/* ----- loader plugins ----- */
import { fetchDuckDuckGo } from './plugins/duckduckgo.mjs'
// import { fetchFmp }       from './plugins/fmp.mjs'       // optional
// import { fetchCrunchbase } from './plugins/crunchbase.mjs' // when key arrives

const loaders = [
  async (q, k) => { try { return await fetchDuckDuckGo(q, k) } catch { return [] } },
  // async (q, k) => { try { return await fetchFmp(q, k)       } catch { return [] } },
  // async (q, k) => { try { return await fetchCrunchbase(q,k) } catch { return [] } }
]

/* ----- main API ----- */
export async function retrieve (query, limit = 5) {
  /* 1 › cache first */
  const cached = await searchCache(query, limit)
  if (cached.length >= limit) {
    addTokens(cached.length * 10)             // negligible; reward cache hits
    return cached.slice(0, limit)
  }

  /* 2 › cascade loaders */
  const results = []
  for (const fn of loaders) {
    const fresh = await fn(query, limit).catch(() => [])
    results.push(...fresh)
    if (results.length >= limit) break
  }

  /* 3 › de‑dupe */
  const seen = new Set()
  const dedup = []
  for (const r of results) {
    if (!seen.has(r.url)) { seen.add(r.url); dedup.push(r) }
    if (dedup.length === limit) break
  }

  /* 4 › token accounting & cache */
  addTokens(dedup.length * 750)   // crude estimate 750 tokens per citation
  upsertCitations(dedup).catch(() => {})

  /* 5 › graceful fallback */
  if (dedup.length === 0) {
    return [{
      title:   'Placeholder citation',
      url:     'https://example.com',
      snippet: 'Retrieval temporarily unavailable',
      date:    new Date().toISOString().split('T')[0]
    }]
  }
  return dedup
}

