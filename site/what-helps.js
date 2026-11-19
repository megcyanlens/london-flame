// "What helps" page: sends an answer to /api/what-helps and draws the word cloud from the word counts it returns.
(function () {
  var API = '/api/what-helps';
  var form = document.getElementById('wh-form');
  var answer = document.getElementById('wh-answer');
  var counter = document.getElementById('wh-count');
  var named = document.getElementById('wh-named');
  var nameWrap = document.getElementById('wh-name-wrap');
  var nameInput = document.getElementById('wh-name');
  var submit = document.getElementById('wh-submit');
  var status = document.getElementById('wh-status');
  var cloud = document.getElementById('wh-cloud');
  var total = document.getElementById('wh-total');

  // Same rules as the server, so we can highlight the words you just added
  function wordsIn(text) {
    return text.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9-]+/).map(function (w) { return w.replace(/^-+|-+$/g, ''); });
  }

  function render(data, mine) {
    var words = data.words || [];
    total.textContent = data.total === 0 ? 'No answers yet. Be the first.'
      : data.total === 1 ? '1 answer so far.' : data.total + ' answers so far.';
    cloud.textContent = '';
    if (!words.length) return;

    var max = words[0][1], min = words[words.length - 1][1];
    // Biggest words in the middle: alternate placing each word on the left or right
    var ordered = [];
    words.forEach(function (w, i) { if (i % 2) ordered.push(w); else ordered.unshift(w); });

    ordered.forEach(function (w) {
      var t = max === min ? 0.5 :(Math.sqrt(w[1]) - Math.sqrt(min)) / (Math.sqrt(max) - Math.sqrt(min));
      var li = document.createElement('li');
      li.textContent = w[0];
      li.style.fontSize = (1 + t * 2.4).toFixed(2) + 'rem';
      li.className = 'tier' + (t > 0.66 ? 3 : t > 0.33 ? 2 : 1) + (mine && mine.indexOf(w[0]) !== -1 ? ' mine' : '');
      li.title = w[1] === 1 ? 'In 1 answer' : 'In ' + w[1] + ' answers';
      cloud.appendChild(li);
    });
  }

  function load() {
    fetch(API).then(function (r) { return r.json(); }).then(function (d) { render(d); })
      .catch(function () { total.textContent = "The word cloud couldn't load. Refresh the page to try again."; });
  }

  answer.addEventListener('input', function () { counter.textContent = answer.value.length + ' / 200'; });

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
    fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        answer: text,
        anonymous: !named.checked,
        name: named.checked ? nameInput.value.trim() : '',
        website: document.getElementById('wh-website').value
      })
    }).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, data: d }; });
    }).then(function (res) {
      if (!res.ok) { status.textContent = res.data.error || 'Something went wrong. Please try again.'; return; }
      render(res.data, wordsIn(text));
      form.reset();
      nameWrap.hidden = true;
      counter.textContent = '0 / 200';
      status.textContent = 'Thank you. Your words are in the cloud.';
      document.getElementById('cloud').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function () {
      status.textContent = "Couldn't send. Check your connection and try again.";
    }).then(function () { submit.disabled = false; });
  });

  load();
})();
