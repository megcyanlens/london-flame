// /api/what-helps
//   GET  ?client=<id>                              -> answers (newest first) with 👍 / 🙋 counts, and which ones this device reacted to
//   POST {action: 'answer', answer, name, anonymous, client}  -> save an answer
//   POST {action: 'react', id, kind: 'up'|'same', client}     -> toggle this device's reaction on an answer
// Data lives in the D1 database bound as DB (see wrangler.toml and docs/what-helps.md).

const QUESTION = 'struggling';
const MAX_ANSWER = 500;
const MAX_NAME = 60;
const MAX_ANSWERS_PER_DEVICE_HOUR = 10;
const MAX_ANSWERS_PER_IP_HOUR = 150; // a whole workshop room shares one IP on the same Wi-Fi
const MAX_SHOWN = 300;
const KINDS = ['up', 'same'];

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

// Random id the browser keeps in localStorage; only used to limit answers and keep one reaction per device
function cleanClient(value) {
  const id = String(value || '');
  return /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : null;
}

async function ipHash(request) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const day = new Date().toISOString().slice(0, 10); // salt changes daily, so hashes can't be linked across days
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`ldnflame:${day}:${ip}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function listAnswers(db, client) {
  const { results } = await db.prepare(`
    SELECT r.id, r.answer, r.name, r.created_at,
      (SELECT COUNT(*) FROM reactions x WHERE x.response_id = r.id AND x.kind = 'up')   AS up,
      (SELECT COUNT(*) FROM reactions x WHERE x.response_id = r.id AND x.kind = 'same') AS same,
      (SELECT GROUP_CONCAT(kind) FROM reactions x WHERE x.response_id = r.id AND x.client_id = ?) AS mine
    FROM responses r
    WHERE r.question = ? AND r.hidden = 0
    ORDER BY r.id DESC
    LIMIT ?`).bind(client || '', QUESTION, MAX_SHOWN).all();
  return {
    total: results.length,
    answers: results.map((r) => ({
      id: r.id, answer: r.answer, name: r.name, created_at: r.created_at,
      up: r.up, same: r.same, mine: r.mine ? r.mine.split(',') : [],
    })),
  };
}

export async function onRequestGet({ request, env }) {
  const client = cleanClient(new URL(request.url).searchParams.get('client'));
  return json(await listAnswers(env.DB, client));
}

async function saveAnswer(body, request, env, client) {
  // Honeypot: a hidden field real people never fill in
  if (body.website) return json(await listAnswers(env.DB, client));

  const answer = String(body.answer || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (answer.length < 2) return json({ error: 'Write a few words before sending.' }, 400);
  if (answer.length > MAX_ANSWER) return json({ error: `Keep it to ${MAX_ANSWER} characters or fewer.` }, 400);
  const name = body.anonymous ? null : String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) || null;

  const hash = await ipHash(request);
  const recent = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM responses WHERE client_hash = ?1 AND created_at > datetime('now', '-1 hour')) AS ip,
      (SELECT COUNT(*) FROM responses WHERE client_id = ?2 AND created_at > datetime('now', '-1 hour')) AS device`)
    .bind(hash, client || '').first();
  if (recent.ip >= MAX_ANSWERS_PER_IP_HOUR || (client && recent.device >= MAX_ANSWERS_PER_DEVICE_HOUR)) {
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
  if (!Number.isInteger(id) || !KINDS.includes(kind)) return json({ error: 'Unknown reaction.' }, 400);

  const exists = await env.DB.prepare('SELECT 1 FROM responses WHERE id = ? AND hidden = 0').bind(id).first();
  if (!exists) return json({ error: 'That answer is no longer here.' }, 404);

  const del = await env.DB
    .prepare('DELETE FROM reactions WHERE response_id = ? AND kind = ? AND client_id = ?')
    .bind(id, kind, client).run();
  if (!del.meta.changes) {
    await env.DB.prepare('INSERT OR IGNORE INTO reactions (response_id, kind, client_id) VALUES (?, ?, ?)')
      .bind(id, kind, client).run();
  }
  const counts = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM reactions WHERE response_id = ?1 AND kind = 'up')   AS up,
      (SELECT COUNT(*) FROM reactions WHERE response_id = ?1 AND kind = 'same') AS same,
      (SELECT GROUP_CONCAT(kind) FROM reactions WHERE response_id = ?1 AND client_id = ?2) AS mine`)
    .bind(id, client).first();
  return json({ ok: true, id, up: counts.up, same: counts.same, mine: counts.mine ? counts.mine.split(',') : [] });
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
  return saveAnswer(body, request, env, client);
}
