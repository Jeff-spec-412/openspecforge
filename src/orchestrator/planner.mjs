import 'dotenv/config';
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model  = process.env.PLANNER_MODEL || "gpt-4o";

export async function plan(brd) {
  const res = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 1500,
    messages: [
      { role: "system", content: "You are a senior product analyst. Output JSON only." },
      { role: "user",
        content: `Draft an outline JSON. For each PRD section include:
                  title, search_queries (array of 3 Google phrases).
                  Input:\n${brd.slice(0, 4000)}` }
    ]
  });
  return JSON.parse(res.choices[0].message.content);
}
