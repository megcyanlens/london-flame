// "What helps" page: sends answers to /api/what-helps and shows each answer as a bubble with emoji reactions and short comments.
// The list refreshes every few seconds so a workshop room sees new answers, reactions and comments appear.
(function () {
  var API = '/api/what-helps';
  var REFRESH_MS = 8000;
  var MAX = 500;
  var MAX_COMMENT_WORDS = 50;
  var form = document.getElementById('wh-form');
  var answer = document.getElementById('wh-answer');
  var counter = document.getElementById('wh-count');
  var named = document.getElementById('wh-named');
  var nameWrap = document.getElementById('wh-name-wrap');
  var nameInput = document.getElementById('wh-name');
  var submit = document.getElementById('wh-submit');
  var status = document.getElementById('wh-status');
  var list = document.getElementById('wh-bubbles');
  var total = document.getElementById('wh-total');
  // [kind, emoji, label shown next to the emoji ('' for none), name for screen readers]
  var REACTIONS = [
    ['up', '👍', '', 'Thumbs up'],
    ['same', '🙋', 'Same', 'Same'],
    ['note', '📝', '', 'Note'],
    ['heart', '❤️', '', 'Heart'],
    ['star', '⭐', '', 'Star']
  ];

  // A random id for this device, so each person reacts once per answer. Falls back to a per-visit id if storage is blocked.
  var client;
  try { client = localStorage.getItem('wh-client'); } catch (e) {}
  if (!client) {
    client = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
    try { localStorage.setItem('wh-client', client); } catch (e) {}
  }

  var bubbles = {}; // answer id -> <li>
  var firstLoad = true;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function wordCount(s) { var t = s.trim(); return t ? t.split(/\s+/).length : 0; }

  function setTotal(n) {
    total.textContent = n === 0 ? 'No answers yet. Be the first.' : n === 1 ? '1 answer so far.' : n + ' answers so far.';
  }

  function updateReactions(li, counts, mine) {
    REACTIONS.forEach(function (r) {
      var btn = li.querySelector('[data-kind="' + r[0] + '"]');
      var n = counts[r[0]] || 0;
      var on = mine.indexOf(r[0]) !== -1;
      btn.querySelector('.n').textContent = n || '';
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on);
      btn.setAttribute('aria-label', r[3] + (n ? ', ' + n : '') + (on ? ', you reacted' : ''));
    });
  }

  // Rebuild a bubble's comment list only when its comments changed, so an open comment box is never disturbed
  function updateComments(li, comments) {
    var key = comments.map(function (c) { return c.id; }).join(',');
    if (li._commentKey === key) return;
    li._commentKey = key;
    var ul = li.querySelector('.wh-comments');
    ul.textContent = '';
    comments.forEach(function (c) {
      var item = el('li', 'wh-comment');
      item.appendChild(el('span', 'wh-comment-text', c.body));
      item.appendChild(el('span', 'wh-comment-who', c.name || 'Anonymous'));
      ul.appendChild(item);
    });
    li.querySelector('.wh-toggle .n').textContent = comments.length || '';
    li.querySelector('.wh-toggle').setAttribute('aria-label', 'Comments' + (comments.length ? ', ' + comments.length : ''));
  }

  function makeBubble(a) {
    var li = el('li', 'wh-bubble');
    li.dataset.id = a.id;
    li.appendChild(el('p', 'wh-text', a.answer));

    var foot = el('div', 'wh-foot');
    foot.appendChild(el('span', 'wh-who-name', a.name || 'Anonymous'));
    var reacts = el('div', 'wh-reacts');
    REACTIONS.forEach(function (r) {
      var btn = el('button', 'wh-react');
      btn.type = 'button';
      btn.dataset.kind = r[0];
      btn.title = r[3];
      btn.innerHTML = '<span aria-hidden="true">' + r[1] + '</span>' + (r[2] ? '<span class="lbl">' + r[2] + '</span>' : '') + '<span class="n"></span>';
      reacts.appendChild(btn);
    });
    var toggle = el('button', 'wh-react wh-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.title = 'Comments';
    toggle.innerHTML = '<span aria-hidden="true">💬</span><span class="lbl">Comment</span><span class="n"></span>';
    reacts.appendChild(toggle);
    foot.appendChild(reacts);
    li.appendChild(foot);

    var thread = el('div', 'wh-thread');
    thread.hidden = true;
    thread.appendChild(el('ul', 'wh-comments'));
    var cform = el('form', 'wh-cform');
    cform.noValidate = true;
    var uid = 'c' + a.id;
    cform.innerHTML =
      '<label class="sr-only" for="' + uid + '-body">Add a comment</label>' +
      '<textarea id="' + uid + '-body" rows="2" maxlength="400" placeholder="Add a comment (up to 50 words)"></textarea>' +
      '<div class="wh-crow">' +
        '<label class="sr-only" for="' + uid + '-name">Your name (optional)</label>' +
        '<input type="text" id="' + uid + '-name" maxlength="60" placeholder="Name (optional)" autocomplete="name">' +
        '<span class="note wh-cwords">0 / 50 words</span>' +
        '<button type="submit" class="wh-csend">Post</button>' +
      '</div>' +
      '<p class="wh-cstatus" role="status" aria-live="polite"></p>';
    thread.appendChild(cform);
    li.appendChild(thread);

    updateReactions(li, a.counts, a.mine);
    updateComments(li, a.comments);
    return li;
  }

  // Newest first. Existing bubbles are updated in place so buttons keep focus and comment boxes keep their text.
  function render(data, highlightId) {
    setTotal(data.total);
    var seen = {};
    var prev = null;
    data.answers.forEach(function (a) {
      seen[a.id] = true;
      var li = bubbles[a.id];
      if (!li) {
        li = bubbles[a.id] = makeBubble(a);
        if (!firstLoad) li.classList.add('new');
        if (a.id === highlightId) li.classList.add('mine');
      } else {
        updateReactions(li, a.counts, a.mine);
        updateComments(li, a.comments);
      }
      var next = prev ? prev.nextSibling : list.firstChild;
      if (li !== next) list.insertBefore(li, next);
      prev = li;
    });
    Object.keys(bubbles).forEach(function (id) {
      if (!seen[id]) { bubbles[id].remove(); delete bubbles[id]; } // hidden or deleted by the committee
    });
    firstLoad = false;
  }

  function load() {
    return fetch(API + '?client=' + encodeURIComponent(client)).then(function (r) { return r.json(); }).then(function (d) { render(d); })
      .catch(function () { if (firstLoad) total.textContent = "The answers couldn't load. Refresh the page to try again."; });
  }

  function post(body) {
    body.client = client;
    return fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); });
  }

  list.addEventListener('click', function (e) {
    var toggle = e.target.closest('.wh-toggle');
    if (toggle) {
      var thread = toggle.closest('.wh-bubble').querySelector('.wh-thread');
      thread.hidden = !thread.hidden;
      toggle.setAttribute('aria-expanded', String(!thread.hidden));
      if (!thread.hidden) thread.querySelector('textarea').focus();
      return;
    }
    var btn = e.target.closest('.wh-react');
    if (!btn || btn.disabled) return;
    var li = btn.closest('.wh-bubble');
    btn.disabled = true;
    post({ action: 'react', id: Number(li.dataset.id), kind: btn.dataset.kind }).then(function (res) {
      if (res.ok) updateReactions(li, res.data.counts, res.data.mine);
      else if (res.data && res.data.error) status.textContent = res.data.error;
    }).catch(function () {}).then(function () { btn.disabled = false; });
  });

  // Live word count in comment boxes
  list.addEventListener('input', function (e) {
    if (e.target.tagName !== 'TEXTAREA') return;
    var n = wordCount(e.target.value);
    var out = e.target.closest('.wh-cform').querySelector('.wh-cwords');
    out.textContent = n + ' / ' + MAX_COMMENT_WORDS + ' words';
    out.classList.toggle('over', n > MAX_COMMENT_WORDS);
  });

  list.addEventListener('submit', function (e) {
    var cform = e.target.closest('.wh-cform');
    if (!cform) return;
    e.preventDefault();
    var li = cform.closest('.wh-bubble');
    var box = cform.querySelector('textarea');
    var nameBox = cform.querySelector('input');
    var send = cform.querySelector('.wh-csend');
    var cstatus = cform.querySelector('.wh-cstatus');
    var text = box.value.trim();
    var n = wordCount(text);
    if (!n) { cstatus.textContent = 'Write a comment first.'; box.focus(); return; }
    if (n > MAX_COMMENT_WORDS) { cstatus.textContent = 'Keep comments to 50 words or fewer.'; box.focus(); return; }
    send.disabled = true;
    cstatus.textContent = 'Posting…';
    post({ action: 'comment', id: Number(li.dataset.id), body: text, name: nameBox.value.trim() }).then(function (res) {
      if (!res.ok) { cstatus.textContent = res.data.error || 'Something went wrong. Please try again.'; return; }
      updateComments(li, res.data.comments);
      box.value = '';
      cform.querySelector('.wh-cwords').textContent = '0 / 50 words';
      cstatus.textContent = '';
    }).catch(function () {
      cstatus.textContent = "Couldn't post. Check your connection and try again.";
    }).then(function () { send.disabled = false; });
  });

  answer.addEventListener('input', function () { counter.textContent = answer.value.length + ' / ' + MAX; });

  Array.prototype.forEach.call(form.querySelectorAll('input[name="who"]'), function (r) {
    r.addEventListener('change', function () {
      nameWrap.hidden = !named.checked;
      if (named.checked) nameInput.focus();
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = answer.value.trim();
    if (text.length < 2) { status.textContent = 'Write a few words before sending.'; answer.focus(); return; }
    if (named.checked && !nameInput.value.trim()) { status.textContent = 'Add your name, or choose "Stay anonymous".'; nameInput.focus(); return; }

    submit.disabled = true;
    status.textContent = 'Sending…';
    post({
      action: 'answer',
      answer: text,
      anonymous: !named.checked,
      name: named.checked ? nameInput.value.trim() : '',
      website: document.getElementById('wh-website').value
    }).then(function (res) {
      if (!res.ok) { status.textContent = res.data.error || 'Something went wrong. Please try again.'; return; }
      render(res.data, res.data.id);
      form.reset();
      nameWrap.hidden = true;
      counter.textContent = '0 / ' + MAX;
      status.textContent = 'Thank you. Your answer is up.';
      var mine = bubbles[res.data.id];
      if (mine) mine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function () {
      status.textContent = "Couldn't send. Check your connection and try again.";
    }).then(function () { submit.disabled = false; });
  });

  load();
  setInterval(function () { if (!document.hidden) load(); }, REFRESH_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
})();
