// Answers to "What do you need when you're struggling?" (site/support.html).
// Stored in the Cloudflare KV namespace bound to this Pages project as NEEDS.
// Each answer is one key; the answer itself lives in the key's metadata, so one list() call returns them all.
//
//   GET  /api/needs   → { answers: [{ text, name, at }] }, newest first
//   POST /api/needs   → body { text, name?, website? }   (website is a hidden spam trap; real people leave it empty)

const MAX_TEXT = 200;
const MAX_NAME = 40;
const PER_HOUR = 10; // answers allowed from one connection per hour

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function clean(s, max) {
  return String(s || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function store(env) {
  if (!env.NEEDS) throw new Error('missing-binding');
  return env.NEEDS;
}

export async function onRequestGet({ env }) {
  let kv;
  try { kv = store(env); } catch (e) { return json({ error: 'Answers are not set up yet.' }, 503); }
  const answers = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: 'a:', cursor });
    for (const k of page.keys) if (k.metadata && k.metadata.text) answers.push(k.metadata);
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  answers.sort((a, b) => b.at - a.at);
  return json({ answers });
}

export async function onRequestPost({ request, env }) {
  let kv;
  try { kv = store(env); } catch (e) { return json({ error: 'Answers are not set up yet.' }, 503); }

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Something went wrong. Please try again.' }, 400); }

  // Bots fill every field; quietly accept and drop.
  if (body.website) return json({ ok: true });

  const text = clean(body.text, MAX_TEXT);
  const name = clean(body.name, MAX_NAME);
  if (text.length < 2) return json({ error: 'Please write a few words first.' }, 400);

  // Light rate limit per connection
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const hour = Math.floor(Date.now() / 3600000);
  const rlKey = 'rl:' + ip + ':' + hour;
  const count = parseInt((await kv.get(rlKey)) || '0', 10);
  if (count >= PER_HOUR) return json({ error: 'Thanks! That’s a lot of answers for now. Please try again later.' }, 429);
  await kv.put(rlKey, String(count + 1), { expirationTtl: 3700 });

  const at = Date.now();
  const answer = { text, name, at };
  const key = 'a:' + String(at).padStart(14, '0') + ':' + crypto.randomUUID().slice(0, 8);
  await kv.put(key, '', { metadata: answer });
  return json({ ok: true, answer });
}
