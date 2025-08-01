import mustache from "mustache";
import { OpenAI } from "openai";
const openai = new OpenAI();

export async function generateSpec(rawInput) {
  // 1. Retrieval (single-call search model)
  const retrPrompt = `Give me 5 recent reputable web sources about ${rawInput}.`;
  const retr = await openai.chat.completions.create({
    model: "gpt-4o-search-preview",
    tools: [{type:"web_search"}],
    messages: [{role:"user",content: retrPrompt}]
  });

  const sources = retr.choices[0].message.content;     // returns markdown list

  // 2. Draft section via mustache template
  const tpl = `
  ## EXEC_SUMMARY
  {{summary}}
  \n\nSources:\n{{{sources}}}
  `;
  const draft = mustache.render(tpl, {
    summary: `This is an auto-summary about ${rawInput}.`,
    sources
  });

  // 3. Evaluation
  const evalPrompt = `
  You are QA GPT. Score 0–100 the following markdown.
  -1 if <2 URLs. -1 if any claim lacks citation.
  Return JSON { "score": n }.
  `;
  const grade = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {role:"system",content:evalPrompt},
      {role:"user",content:draft.slice(0,16000)}
    ]
  });
  const score = JSON.parse(grade.choices[0].message.content).score;

  // 4. Retry once if score < 80
  if (score < 80) {
    return await generateSpec(rawInput);      // naive retry; improve later
  }
  return { markdown: draft, qaScore: score };
}
