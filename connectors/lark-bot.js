import fs          from 'fs';
import express     from 'express';
import bodyParser  from 'body-parser';
import * as lark   from '@larksuiteoapi/node-sdk';
import { run }     from '../src/run.mjs';
import 'dotenv/config';

/* ---------- creds ---------- */
const appId     = process.env.LARK_APP_ID;
const appSecret = process.env.LARK_APP_SECRET;
const verifyTok = process.env.LARK_VERIFY_TOKEN;   // for challenge/verify
const port      = process.env.PORT || 3005;

/* ---------- Lark client ---------- */
const client = new lark.Client({ appId, appSecret });

/* ---------- EventDispatcher ---------- */
const dispatcher = new lark.EventDispatcher({
  verificationToken: verifyTok               // handles URL‑verify & signature
}).register({
  'im.message.receive_v1': async (ctx) => {
    const { text = '', files = [] } = ctx.event.message;
    const promptText = text.replace('/spec', '').trim();

    /* 1 › obtain BRD */
    let brd = promptText;
    if (!brd && files.length) {
      const fileKey = files[0].file_key;
      const buf = await client.drive.getFileContent({ file_key: fileKey });
      brd = buf.toString('utf8');
    }
    if (!brd) {
      await client.im.message.replyText(ctx.event.message_id,
        '❌ Attach a Markdown BRD or type after /spec.');
      return;
    }

    /* 2 › run pipeline */
    await client.im.message.replyText(ctx.event.message_id, '⏳ Generating spec…');
    try {
      const mdPath = await run(brd);
      const specMd = fs.readFileSync(mdPath, 'utf8');
      await client.im.message.replyText(
        ctx.event.message_id,
        '✅ Done!\n\n```markdown\n' + specMd.slice(0, 3500) + '```'
      );
    } catch (e) {
      await client.im.message.replyText(
        ctx.event.message_id,
        '❌ Error: ' + e.message.slice(0, 1000)
      );
    }
  }
});

/* ---------- Express server ---------- */
const app = express();
app.use(bodyParser.json());                       // SDK needs raw JSON
app.use('/webhook/event', lark.adaptExpress(dispatcher));

app.listen(port, () => console.log('Lark bot listening on :' + port));

