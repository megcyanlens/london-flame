// /api/what-helps
//   GET  ?client=<id>   -> answers (newest first) with reaction counts, this device's reactions, and comments
//   POST {action: 'answer',  answer, name, anonymous, client}  -> save an answer
//   POST {action: 'react',   id, kind, client}                 -> toggle this device's reaction on an answer
//   POST {action: 'comment', id, body, name, client}           -> add a comment (up to 50 words) to an answer
// Data lives in the D1 database bound as DB (see wrangler.toml and docs/what-helps.md).

const QUESTION = 'struggling';
const MAX_ANSWER = 500;
const MAX_NAME = 60;
const MAX_COMMENT_WORDS = 50;
const MAX_COMMENT_CHARS = 400;
const LIMITS = { // per hour; a whole workshop room shares one IP on the same Wi-Fi, so the IP caps are generous
  answers: { device: 10, ip: 150 },
  comments: { device: 30, ip: 400 },
};
const MAX_SHOWN = 300;
const KINDS = ['up', 'same', 'note', 'heart', 'star'];

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

// Random id the browser keeps in localStorage; only used for rate limits and one-reaction-per-device
function cleanClient(value) {
  const id = String(value || '');
  return /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : null;
}

const cleanName = (value) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) || null;

async function ipHash(request) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const day = new Date().toISOString().slice(0, 10); // salt changes daily, so hashes can't be linked across days
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`ldnflame:${day}:${ip}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// table is a fixed name from this file, never user input
async function overLimit(db, table, limit, hash, client) {
  const r = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM ${table} WHERE client_hash = ?1 AND created_at > datetime('now', '-1 hour')) AS ip,
      (SELECT COUNT(*) FROM ${table} WHERE client_id = ?2 AND created_at > datetime('now', '-1 hour')) AS device`)
    .bind(hash, client || '').first();
  return r.ip >= limit.ip || (client && r.device >= limit.device);
}

// Reaction counts and this device's reactions, either for one answer or for every visible answer to the question.
// (Joins rather than long IN (...) lists: D1 allows at most 100 bound values per query.)
async function reactionState(db, client, oneId) {
  const scope = oneId
    ? ['x.response_id = ?', [oneId]]
    : ['x.response_id IN (SELECT id FROM responses WHERE question = ? AND hidden = 0)', [QUESTION]];
  const [all, own] = await db.batch([
    db.prepare(`SELECT response_id, kind, COUNT(*) AS n FROM reactions x WHERE ${scope[0]} GROUP BY response_id, kind`).bind(...scope[1]),
    db.prepare(`SELECT response_id, kind FROM reactions x WHERE x.client_id = ? AND ${scope[0]}`).bind(client || '', ...scope[1]),
  ]);
  const counts = {}, mine = {};
  for (const r of all.results) (counts[r.response_id] ||= {})[r.kind] = r.n;
  for (const r of own.results) (mine[r.response_id] ||= []).push(r.kind);
  return { counts, mine };
}

async function listAnswers(db, client) {
  const { results } = await db.prepare(
    'SELECT id, answer, name, created_at FROM responses WHERE question = ? AND hidden = 0 ORDER BY id DESC LIMIT ?',
  ).bind(QUESTION, MAX_SHOWN).all();
  const { counts, mine } = await reactionState(db, client);
  const comments = {};
  const c = await db.prepare(`
    SELECT c.id, c.response_id, c.body, c.name, c.created_at
    FROM comments c JOIN responses r ON r.id = c.response_id
    WHERE c.hidden = 0 AND r.hidden = 0 AND r.question = ?
    ORDER BY c.id`).bind(QUESTION).all();
  for (const r of c.results) (comments[r.response_id] ||= []).push({ id: r.id, body: r.body, name: r.name, created_at: r.created_at });
  return {
    total: results.length,
    answers: results.map((r) => ({
      id: r.id, answer: r.answer, name: r.name, created_at: r.created_at,
      counts: counts[r.id] || {}, mine: mine[r.id] || [], comments: comments[r.id] || [],
    })),
  };
}

export async function onRequestGet({ request, env }) {
  const client = cleanClient(new URL(request.url).searchParams.get('client'));
  return json(await listAnswers(env.DB, client));
}

async function answerVisible(db, id) {
  return Number.isInteger(id) && !!(await db.prepare('SELECT 1 FROM responses WHERE id = ? AND hidden = 0').bind(id).first());
}

async function saveAnswer(body, request, env, client) {
  // Honeypot: a hidden field real people never fill in
  if (body.website) return json(await listAnswers(env.DB, client));

  const answer = String(body.answer || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (answer.length < 2) return json({ error: 'Write a few words before sending.' }, 400);
  if (answer.length > MAX_ANSWER) return json({ error: `Keep it to ${MAX_ANSWER} characters or fewer.` }, 400);
  const name = body.anonymous ? null : cleanName(body.name);

  const hash = await ipHash(request);
  if (await overLimit(env.DB, 'responses', LIMITS.answers, hash, client)) {
    return json({ error: "Thanks, you've sent lots already. Try again a bit later." }, 429);
  }
  const { meta } = await env.DB
    .prepare('INSERT INTO responses (question, answer, name, client_hash, client_id) VALUES (?, ?, ?, ?, ?)')
    .bind(QUESTION, answer, name, hash, client)
    .run();
  return json({ ok: true, id: meta.last_row_id, ...(await listAnswers(env.DB, client)) });
}

async function toggleReaction(body, env, client) {
  if (!client) return json({ error: "Couldn't save your reaction. Refresh the page and try again." }, 400);
  const id = Number(body.id);
  const kind = String(body.kind);
  if (!KINDS.includes(kind)) return json({ error: 'Unknown reaction.' }, 400);
  if (!(await answerVisible(env.DB, id))) return json({ error: 'That answer is no longer here.' }, 404);

  const del = await env.DB
    .prepare('DELETE FROM reactions WHERE response_id = ? AND kind = ? AND client_id = ?')
    .bind(id, kind, client).run();
  if (!del.meta.changes) {
    await env.DB.prepare('INSERT OR IGNORE INTO reactions (response_id, kind, client_id) VALUES (?, ?, ?)')
      .bind(id, kind, client).run();
  }
  const { counts, mine } = await reactionState(env.DB, client, id);
  return json({ ok: true, id, counts: counts[id] || {}, mine: mine[id] || [] });
}

async function addComment(body, request, env, client) {
  if (body.website) return json({ ok: true });
  const id = Number(body.id);
  const text = String(body.body || '').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  if (words < 1 || text.length < 2) return json({ error: 'Write a comment first.' }, 400);
  if (words > MAX_COMMENT_WORDS || text.length > MAX_COMMENT_CHARS) {
    return json({ error: `Keep comments to ${MAX_COMMENT_WORDS} words or fewer.` }, 400);
  }
  if (!(await answerVisible(env.DB, id))) return json({ error: 'That answer is no longer here.' }, 404);

  const hash = await ipHash(request);
  if (await overLimit(env.DB, 'comments', LIMITS.comments, hash, client)) {
    return json({ error: "Thanks, you've commented lots already. Try again a bit later." }, 429);
  }
  await env.DB
    .prepare('INSERT INTO comments (response_id, body, name, client_hash, client_id) VALUES (?, ?, ?, ?, ?)')
    .bind(id, text, cleanName(body.name), hash, client)
    .run();
  const { results } = await env.DB
    .prepare('SELECT id, body, name, created_at FROM comments WHERE response_id = ? AND hidden = 0 ORDER BY id')
    .bind(id).all();
  return json({ ok: true, id, comments: results });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send your answer as JSON.' }, 400);
  }
  const client = cleanClient(body.client);
  if (body.action === 'react') return toggleReaction(body, env, client);
  if (body.action === 'comment') return addComment(body, request, env, client);
  return saveAnswer(body, request, env, client);
}
