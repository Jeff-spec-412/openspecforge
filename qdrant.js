import { QdrantClient } from '@qdrant/js-client-rest'
import OpenAI from 'openai'
import crypto from 'crypto'

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333'
const COLLECTION = 'citations'
const EMBED_DIM = 1536   // OpenAI embedding size

const qc = new QdrantClient({ url: QDRANT_URL })
const openai = new OpenAI()

/* ---------- initialise collection if missing ---------- */
export async function ensureCollection () {
  const exists = await qc.getCollections()
    .then(r => r.collections.some(c => c.name === COLLECTION))
  if (!exists) {
    await qc.createCollection(COLLECTION, {
      vectors: { size: EMBED_DIM, distance: 'Cosine' }
    })
  }
}

/* ---------- helper: embed text once ---------- */
async function embed (text) {
  const { data } = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 4096)
  })
  return data[0].embedding
}

/* ---------- search cache ---------- */
export async function searchCache (query, top = 5) {
  await ensureCollection()
  const vector = await embed(query)
  const res = await qc.search(COLLECTION, { vector, limit: top })
  return res.map(pt => pt.payload)           // [{ title,url,snippet,date }]
}

/* ---------- upsert citations ---------- */
export async function upsertCitations (citations) {
  await ensureCollection()
  const points = await Promise.all(
    citations.map(async (c) => ({
      id: crypto.createHash('sha1').update(c.url).digest('hex'),
      vector: await embed(c.snippet),
      payload: c
    }))
  )
  await qc.upsert(COLLECTION, { points })
}

