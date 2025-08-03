/* ─────────────────  Retriever module  ─────────────────
   • Hybrid: GPT-4 browser tool → fallback loader array
   • Caches citations in Qdrant
   • Token-quota accounting via addTokens()
   • Dedup + graceful placeholder
   ───────────────────────────────────────────────────── */

import { callBrowserTool } from './browser.mjs';          // NEW
import { fetchDuckDuckGo } from './plugins/duckduckgo.mjs';
import { upsertCitations, searchCache } from '../cache/qdrant.js';
import { addTokens } from '../guard/usage.js';

/* ------- loader cascade ------- */
const loaders = [
  async (q, k) => {        // 1️⃣  Browser tool
    try { return await callBrowserTool(q, k); } catch { return []; }
  },
  async (q, k) => {        // 2️⃣  DuckDuckGo JSON
    try { return await fetchDuckDuckGo(q, k); } catch { return []; }
  }
  // You can uncomment / add more loaders here (FMP, Crunchbase…)
];

/* ------- main API ------- */
export async function retrieve (query, limit = 5) {
  /* 0 › vector-cache first */
  const cached = await searchCache(query, limit);
  if (cached.length >= limit) {
    addTokens(cached.length * 10);          // negligible; reward cache hits
    return cached.slice(0, limit);
  }

  /* 1 › cascade loaders in order */
  const results = [];
  for (const fn of loaders) {
    const fresh = await fn(query, limit).catch(() => []);
    results.push(...fresh);
    if (results.length >= limit) break;
  }

  /* 2 › deduplicate */
  const seen = new Set();
  const dedup = [];
  for (const r of results) {
    if (!seen.has(r.url)) { seen.add(r.url); dedup.push(r); }
    if (dedup.length === limit) break;
  }

  /* 3 › quota + cache */
  addTokens(dedup.length * 750);            // rough estimate ~750 tokens per cite
  upsertCitations(dedup).catch(() => {});

  /* 4 › graceful fallback */
  if (dedup.length === 0) {
    return [{
      title:   'Placeholder citation',
      url:     'https://example.com',
      snippet: 'Retrieval temporarily unavailable',
      date:    new Date().toISOString().split('T')[0]
    }];
  }
  return dedup;
}

