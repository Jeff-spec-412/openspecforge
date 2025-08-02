import client from 'prom-client'

/* ─────────  Daily quota  ───────── */
const QUOTA = 200_000  // tokens per UTC day

export const tokenGauge = new client.Gauge({
  name: 'openai_tokens_today',
  help: 'Tokens consumed since 00:00 UTC'
})

/* initialise to zero so .values[] exists */
tokenGauge.set(0)

/* safe getter */
function currentTokens () {
  const metrics = tokenGauge.get()
  return metrics?.values?.[0]?.value || 0
}

export function addTokens (n) {
  const next = currentTokens() + n
  tokenGauge.set(next)
  if (next > QUOTA) {
    throw new Error(`Daily token quota ${QUOTA} exceeded (${next})`)
  }
}

