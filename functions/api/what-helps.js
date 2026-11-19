// /api/what-helps
//   GET  -> word counts for the word cloud (never the raw answers or names)
//   POST -> save an answer, then return the updated word counts
// Data lives in the D1 database bound as DB (see wrangler.toml and docs/what-helps.md).

const QUESTION = 'struggling';
const MAX_ANSWER = 200;
const MAX_NAME = 60;
const MAX_PER_HOUR = 5;
const MAX_WORDS = 80;

// Words too common to say anything on their own, plus the question's own words
const STOPWORDS = new Set((
  'a about after again all also am an and any are as at be because been being but by can could did do does doing done ' +
  'for from get gets getting go going got had has have having he her here him his how i if im in into is it its ive ' +
  'just let lets like make me more most much my myself need needs needed no not of off on one only or other our out ' +
  'over really so some something such than that thats the their them then there these they thing things this those ' +
  'to too up us very want was way we were what whats when where which while who why will with would you your youre ' +
  'struggling struggle feel feeling dont cant id ill bit lot maybe even still sometimes always usually'
).split(' '));

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

async function wordCounts(db) {
  const { results } = await db
    .prepare('SELECT answer FROM responses WHERE question = ? AND hidden = 0')
    .bind(QUESTION)
    .all();
  const counts = new Map();
  for (const { answer } of results) {
    const seen = new Set(); // count each word once per answer, so one long answer can't dominate
    for (const raw of answer.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9-]+/)) {
      const word = raw.replace(/^-+|-+$/g, '');
      if (word.length < 3 || STOPWORDS.has(word) || /^\d+$/.test(word) || seen.has(word)) continue;
      seen.add(word);
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }
  const words = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, MAX_WORDS);
  return { total: results.length, words };
}

async function clientHash(request) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const day = new Date().toISOString().slice(0, 10); // salt changes daily, so hashes can't be linked across days
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`ldnflame:${day}:${ip}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet({ env }) {
  return json(await wordCounts(env.DB));
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send your answer as JSON.' }, 400);
  }

  // Honeypot: a hidden field real people never fill in
  if (body.website) return json(await wordCounts(env.DB));

  const answer = String(body.answer || '').replace(/\s+/g, ' ').trim();
  if (answer.length < 2) return json({ error: 'Write a few words before sending.' }, 400);
  if (answer.length > MAX_ANSWER) return json({ error: `Keep it to ${MAX_ANSWER} characters or fewer.` }, 400);

  const name = body.anonymous ? null : String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) || null;

  const hash = await clientHash(request);
  const { n } = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM responses WHERE client_hash = ? AND created_at > datetime('now', '-1 hour')")
    .bind(hash)
    .first();
  if (n >= MAX_PER_HOUR) return json({ error: "Thanks — you've sent a few already. Try again in an hour." }, 429);

  await env.DB
    .prepare('INSERT INTO responses (question, answer, name, client_hash) VALUES (?, ?, ?, ?)')
    .bind(QUESTION, answer, name, hash)
    .run();

  return json({ ok: true, ...(await wordCounts(env.DB)) });
}
