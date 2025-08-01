import express from 'express'
import client from 'prom-client'
import { run } from './src/run.mjs'

client.collectDefaultMetrics()
const app = express()
app.use(express.json({ limit: '2mb' }))

/* health‑check */
app.get('/', (_, res) => res.send('metrics server OK'))

/* -------- /spec endpoint --------
   Expects: { "brd": "# Payment Score BRD\n..." }
---------------------------------- */
app.post('/spec', async (req, res) => {
  const brd = req.body?.brd
  if (!brd) return res.status(400).send('Missing "brd" field in JSON')

  try {
    const path = await run(brd)
    res.json({ ok: true, path })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

/* Prometheus scrape */
app.get('/metrics', async (_, res) => {
  res.set('Content-Type', client.register.contentType)
  res.end(await client.register.metrics())
})

app.listen(9100, () => console.log('metrics server on :9100'))

