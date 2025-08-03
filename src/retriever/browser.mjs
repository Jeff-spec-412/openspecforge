cd ~/Desktop/Projects/openspecforge   # $ROOT
mkdir -p src/retriever

cat > src/retriever/browser.mjs <<'EOF'
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const assistantId = process.env.OPENAI_ASSISTANT_ID;     // browser‑enabled

export async function callBrowserTool (query, limit = 5) {
  if (!assistantId) return [];        // skip if ID not provided
  const thread = await openai.beta.threads.create();
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: `Search the web for: "${query}". 
              Return up to ${limit} relevant paragraphs with citation links.`
  });
  const run = await openai.beta.threads.runs.create(thread.id, { assistant_id: assistantId });

  // poll until done
  let status = run.status;
  while (status !== "completed") {
    await new Promise(r => setTimeout(r, 1200));
    const upd = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    status = upd.status;
  }

  const msgs = await openai.beta.threads.messages.list(thread.id);
  const raw = msgs.data[0].content[0].text.value;   // raw markdown string

  // very naive split: expect each citation line "1. title — url"
  const lines = raw.split('\n').filter(l => l.includes('http'));
  return lines.slice(0, limit).map(line => {
    const [titlePart, url] = line.split('http');
    return {
      title: titlePart.replace(/^\d+\.\s*/, '').trim(),
      url: 'http' + url.trim(),
      snippet: titlePart.trim(),
      date: new Date().toISOString().split('T')[0]
    };
  });
}
EOF

