import client from 'prom-client'

/* Daily token quota (adjust as you like) */
const QUOTA = 200_000

export const tokenGauge = new client.Gauge({
  name: 'openai_tokens_today',
  help: 'Tokens consumed since 00:00 UTC'
})

export function addTokens (n) {
  const soFar = tokenGauge.get().values[0]?.value || 0
  const next  = soFar + n
  tokenGauge.set(next)
  if (next > QUOTA) {
    throw new Error(`Daily token quota ${QUOTA} exceeded (` + next + ')')
  }
}

