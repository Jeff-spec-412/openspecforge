import { QdrantClient } from '@qdrant/js-client-rest'
import OpenAI from 'openai'
import crypto from 'crypto'

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333'
const COLLECTION = 'citations'
const EMBED_DIM = 1536            // OpenAI embedding size

// Flag will flip to false if we can't reach Qdrant once
let qdrantOnline = true
const qc      = new QdrantClient({ url: QDRANT_URL })
const openai  = process.env.OPENAI_API_KEY ? new OpenAI() : null

async function ensureCollection () {
  if (!qdrantOnline) return false
  try {
    const exists = await qc.getCollections()
      .then(r => r.collections.some(c => c.name === COLLECTION))
    if (!exists) {
      await qc.createCollection(COLLECTION, {
        vectors: { size: EMBED_DIM, distance: 'Cosine' }
      })
    }
    return true
  } catch (e) {
    console.warn('⚠️  Qdrant unreachable, vector cache disabled:', e.code || e.message)
    qdrantOnline = false
    return false
  }
}

async function embed (text) {
  if (!openai) return Array(EMBED_DIM).fill(0)
  const { data } = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 4096)
  })
  return data[0].embedding
}

export async function searchCache (query, top = 5) {
  if (!(await ensureCollection())) return []
  try {
    const vector = await embed(query)
    const res = await qc.search(COLLECTION, { vector, limit: top })
    return res.map(pt => pt.payload)
  } catch {
    return []
  }
}

export async function upsertCitations (citations) {
  if (!(await ensureCollection())) return
  try {
    const points = await Promise.all(
      citations.map(async c => ({
        id: crypto.createHash('sha1').update(c.url).digest('hex'),
        vector: await embed(c.snippet),
        payload: c
      }))
    )
    await qc.upsert(COLLECTION, { points })
  } catch {/* ignore */}
}

