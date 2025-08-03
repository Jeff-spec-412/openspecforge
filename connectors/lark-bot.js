import fs from 'fs';
import { Client } from '@larksuiteoapi/node-sdk';
import { run }   from '../src/run.mjs';    // hybrid pipeline

/* ─────── Lark credentials ────── */
const appId     = process.env.LARK_APP_ID;
const appSecret = process.env.LARK_APP_SECRET;
const port      = process.env.PORT || 3005;

/* ─────── Lark client ────── */
const cli = new Client({ appId, appSecret, appType: 'self' });

/* ─────── Slash‑command handler ────── */
cli.im.message.setHandler(async (data) => {
  const { text = '', files = [] } = data.event.message;
  const promptText = text.replace('/spec', '').trim();

  /* 1 ‑ get BRD text */
  let brd = promptText;
  if (!brd && files.length) {
    const fileKey = files[0].file_key;
    const buf = await cli.drive.getFileContent({ file_key: fileKey });
    brd = buf.toString('utf8');
  }
  if (!brd) {
    await cli.im.message.replyText(data.event.message_id,
      '❌ Please attach a Markdown BRD or type text after /spec.');
    return;
  }

  /* 2 ‑ run pipeline */
  await cli.im.message.replyText(data.event.message_id, '⏳ Generating spec…');
  try {
    const mdPath = await run(brd);               // returns path e.g. runs/1234/spec.md
    const specMd = fs.readFileSync(mdPath, 'utf8');

    await cli.im.message.replyText(
      data.event.message_id,
      '✅ Done!\n\n```markdown\n' + specMd.slice(0, 3500) + '```'
    );
  } catch (e) {
    await cli.im.message.replyText(
      data.event.message_id,
      '❌ Error: ' + e.message.slice(0, 1000)
    );
  }
});

/* ─────── start server ────── */
cli.start(port);
console.log('Lark bot listening on :' + port);

