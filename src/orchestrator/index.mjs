import { plan }         from './planner.mjs';
import { buildSection } from './worker.mjs';
import { synthesise }   from './synthesiser.mjs';
import pLimit           from 'p-limit';

/* ---------- public API ---------- */
export async function generatePRD(brd) {
  const outline  = await plan(brd);               // 1 Planner
  const limit    = pLimit(6);                     // 6 parallel workers

  const drafts = await Promise.all(
    outline.sections.map(sec =>
      limit(() => retrySection(sec, 3))            // 2 Workers
    )
  );

  const merged = await synthesise(drafts);         // 3 Synthesiser
  return merged;
}

/* ---------- helper: retry N times ---------- */
async function retrySection(sec, attempts) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await buildSection(sec);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

