import 'dotenv/config';
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model  = process.env.RETRIEVER_MODEL || "gpt-4o";

export async function buildSection(sec) {
  const rsp = await openai.responses.create({
    model,
    tools: [{ type: "web_search_preview", search_context_size: "high" }],
    input: `Write the "${sec.title}" chapter (~400 words) with Markdown and inline links.
            Use these queries verbatim when browsing:\n${sec.search_queries.join('\n')}`
  });
  return rsp.output_text;
}
