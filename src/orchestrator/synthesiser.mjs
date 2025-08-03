import 'dotenv/config';
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model  = process.env.WRITER_MODEL || "gpt-4o";

export async function synthesise(markdownChunks) {
  const joined = markdownChunks.join('\n\n');
  const res = await openai.chat.completions.create({
    model,
    temperature: 0.4,
    max_tokens: 2000,
    messages: [
      { role: "system", content: "You are a world‑class technical writer. Return Markdown only." },
      { role: "user",   content: `Merge and harmonise the chapters below:\n${joined}` }
    ]
  });
  return res.choices[0].message.content;
}
