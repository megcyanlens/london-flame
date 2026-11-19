// "What helps" page: sends answers to /api/what-helps and shows every answer as a bubble with 👍 / 🙋 Same reactions.
// The list refreshes every few seconds so a workshop room sees new answers appear.
(function () {
  var API = '/api/what-helps';
  var REFRESH_MS = 8000;
  var MAX = 500;
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
  var REACTIONS = [['up', '👍', 'Thumbs up'], ['same', '🙋', 'Same']];

  // A random id for this device, so each person reacts once per answer. Falls back to a per-visit id if storage is blocked.
  var client;
  try { client = localStorage.getItem('wh-client'); } catch (e) {}
  if (!client) {
    client = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
    try { localStorage.setItem('wh-client', client); } catch (e) {}
  }

  var bubbles = {}; // answer id -> <li>
  var firstLoad = true;

  function setTotal(n) {
    total.textContent = n === 0 ? 'No answers yet. Be the first.' : n === 1 ? '1 answer so far.' : n + ' answers so far.';
  }

  function updateReactions(li, a) {
    REACTIONS.forEach(function (r) {
      var btn = li.querySelector('[data-kind="' + r[0] + '"]');
      var on = a.mine.indexOf(r[0]) !== -1;
      btn.querySelector('.n').textContent = a[r[0]] || '';
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on);
      btn.setAttribute('aria-label', r[2] + (a[r[0]] ? ', ' + a[r[0]] : '') + (on ? ', you reacted' : ''));
    });
  }

  function makeBubble(a) {
    var li = document.createElement('li');
    li.className = 'wh-bubble';
    li.dataset.id = a.id;
    var text = document.createElement('p');
    text.className = 'wh-text';
    text.textContent = a.answer;
    var foot = document.createElement('div');
    foot.className = 'wh-foot';
    var who = document.createElement('span');
    who.className = 'wh-who-name';
    who.textContent = a.name || 'Anonymous';
    var reacts = document.createElement('div');
    reacts.className = 'wh-reacts';
    REACTIONS.forEach(function (r) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wh-react';
      btn.dataset.kind = r[0];
      btn.title = r[2];
      btn.innerHTML = '<span aria-hidden="true">' + r[1] + '</span>' + (r[0] === 'same' ? '<span class="lbl">Same</span>' : '') + '<span class="n"></span>';
      reacts.appendChild(btn);
    });
    foot.appendChild(who);
    foot.appendChild(reacts);
    li.appendChild(text);
    li.appendChild(foot);
    updateReactions(li, a);
    return li;
  }

  // Newest first. Existing bubbles are updated in place so buttons keep focus while the list refreshes.
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
        updateReactions(li, a);
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
    var btn = e.target.closest('.wh-react');
    if (!btn || btn.disabled) return;
    var li = btn.closest('.wh-bubble');
    var id = Number(li.dataset.id);
    btn.disabled = true;
    post({ action: 'react', id: id, kind: btn.dataset.kind }).then(function (res) {
      if (res.ok) updateReactions(li, res.data);
      else if (res.data && res.data.error) status.textContent = res.data.error;
    }).catch(function () {}).then(function () { btn.disabled = false; });
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
