import { plan }          from './planner.mjs';
import { buildSection }  from './worker.mjs';
import { synthesise }    from './synthesiser.mjs';
import pLimit            from 'p-limit';

export async function generatePRD(brd) {
  const outline = await plan(brd);
  const limit   = pLimit(6);                      // 6 parallel workers

  const results = await Promise.all(
    outline.sections.map(sec => limit(() => retrySection(sec)))
  );

  const merged  = await synthesise(results);
  return merged;
}

/* ---------- helper: retry 2x on failure ---------- */
async function retrySection(sec, attempts = 3) {
  for (let i=0;i<attempts;i++) {
    try   { return await buildSection(sec); }
    catch { if (i === attempts-1) throw }
  }
}
