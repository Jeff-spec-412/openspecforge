import fs   from 'fs';
import pkg  from '@larksuiteoapi/node-sdk';
const { Client } = pkg;
import { run }  from '../src/run.mjs';
import 'dotenv/config';

/* ---------- creds ---------- */
const appId     = process.env.LARK_APP_ID;
const appSecret = process.env.LARK_APP_SECRET;
const port      = process.env.PORT || 3005;

/* ---------- client ---------- */
const cli = new Client({ appId, appSecret });

/* ---------- universal event-bind helper ---------- */
function bindEvent(eventName, fn) {
  if (cli?.event?.on)                 return cli.event.on(eventName, fn);         // older API
  if (cli?.eventDispatcher?.on)       return cli.eventDispatcher.on(eventName, fn); // mid API
  if (cli?.on)                        return cli.on(eventName, fn);                // latest API
  throw new Error('⚠️  No event API found on Lark SDK');
}

/* ---------- handler ---------- */
async function handleMessage(ctx) {
  const { text = '', files = [] } = ctx.event.message;
  const promptText = text.replace('/spec', '').trim();

  let brd = promptText;
  if (!brd && files.length) {
    const fileKey = files[0].file_key;
    const buf = await cli.drive.getFileContent({ file_key: fileKey });
    brd = buf.toString('utf8');
  }
  if (!brd) {
    await cli.im.message.replyText(ctx.event.message_id,
      '❌ Please attach a Markdown BRD or type after /spec.');
    return;
  }

  await cli.im.message.replyText(ctx.event.message_id, '⏳ Generating spec…');
  try {
    const mdPath = await run(brd);
    const specMd = fs.readFileSync(mdPath, 'utf8');
    await cli.im.message.replyText(
      ctx.event.message_id,
      '✅ Done!\n\n```markdown\n' + specMd.slice(0, 3500) + '```'
    );
  } catch (e) {
    await cli.im.message.replyText(
      ctx.event.message_id,
      '❌ Error: ' + e.message.slice(0, 1000)
    );
  }
}

/* ---------- bind & serve ---------- */
bindEvent('im.message.receive_v1', handleMessage);
cli.start(port);
console.log('Lark bot listening on :' + port);

