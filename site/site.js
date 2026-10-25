// Site navigation: edit this list to change the sidebar on every page.
// An item is ['Label', 'section-id'] for a section of that page, or ['Label', 'page.html'] for a page of its own.
// A section item can add a list of pages it covers, which keeps it highlighted while you're on one of them.
var NAV = {
  quick: [
    ['How to join', 'index.html#join'],
    ['Payment details', 'index.html#payment'],
    ['Calendars', 'calendars.html'],
    ['Team roster', 'team.html#roster'],
    ['All resources', 'index.html#resources']
  ],
  pages: [
    { title: 'Club', href: 'index.html', items: [
      ['About the club', 'about'], ['How to join', 'join'], ['Club fees', 'fees'], ['Payment details', 'payment'],
      ['Tournaments', 'tournaments'], ['Club resources', 'resources'],
      ['Governing documents', 'governing', ['constitution.html', 'safeguarding.html', 'anti-bullying.html']],
      ['Calendars', 'calendars.html'] ] },
    { title: 'WFFL Team', href: 'team.html', items: [
      ['Season overview', 'season'], ['JustGo signup', 'justgo'], ['Team expectations', 'expectations'], ['Roster', 'roster'],
      ['Kit', 'kit'], ['Membership regulation', 'regulation'],
      ['Referee cheat sheet', 'referee.html'], ['Reffing tracker', 'ref-tracker.html'] ] },
    { title: 'Committee', href: 'committee.html', items: [
      ['Internal docs', 'internal-docs'], ['Committee members', 'roles'], ['Open roles', 'open-roles'],
      ['Team captains', 'captains'], ['Coaching staff', 'coaches'], ['Pitch booking', 'pitch-booking'] ] }
  ]
};

(function () {
  var current = document.body.getAttribute('data-page') + '.html';
  var nav = document.getElementById('site-nav');
  var chevron = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function isPage(target) { return /\.html/.test(target); }
  // A section item can list related pages (third element) that keep it highlighted, e.g. the governing documents
  function covers(it) { return !!it[2] && it[2].indexOf(current) !== -1; }
  // 'page.html#id' becomes '#id' when it points at the page we're on
  function href(target) {
    var parts = target.split('#');
    return parts[1] && parts[0] === current ? '#' + parts[1] : target;
  }

  var html = '<h4>Quick links</h4><ul class="quick-list">';
  NAV.quick.forEach(function (q) {
    html += '<li><a href="' + href(q[1]) + '"' + (q[1] === current ? ' class="active" aria-current="page"' : '') + '>' + esc(q[0]) + '</a></li>';
  });
  html += '</ul><h4>Pages</h4>';
  NAV.pages.forEach(function (p, i) {
    var here = p.href === current;
    var open = here || p.items.some(function (it) { return it[1] === current || covers(it); });
    html += '<div class="grp"><div class="grp-head">' +
      '<a href="' + p.href + '"' + (here ? ' class="current" aria-current="page"' : '') + '>' + esc(p.title) + '</a>' +
      '<button type="button" class="grp-toggle" aria-expanded="' + open + '" aria-controls="grp-' + i + '" aria-label="Show ' + esc(p.title) + ' sections">' + chevron + '</button>' +
      '</div><ul id="grp-' + i + '"' + (open ? '' : ' hidden') + '>';
    p.items.forEach(function (it) {
      if (isPage(it[1])) {
        html += '<li><a class="page-link' + (it[1] === current ? ' active" aria-current="page' : '') + '" href="' + it[1] + '">' + esc(it[0]) + '</a></li>';
      } else {
        html += '<li><a data-id="' + it[1] + '" href="' + href(p.href + '#' + it[1]) + '"' + (covers(it) ? ' class="active"' : '') + '>' + esc(it[0]) + '</a></li>';
      }
    });
    html += '</ul></div>';
  });
  nav.innerHTML = html;

  nav.addEventListener('click', function (e) {
    var b = e.target.closest('.grp-toggle');
    if (b) {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open);
      document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
      return;
    }
    var a = e.target.closest('a');
    if (!a) return;
    toc.classList.remove('open');
    if (a.dataset.id && links[a.dataset.id]) lockTo(a.dataset.id);
  });

  // Phone menu
  var toc = document.querySelector('.toc');
  var menuBtn = document.querySelector('.menu-btn');
  menuBtn.addEventListener('click', function () {
    var open = toc.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
    if (open) window.scrollTo({ top: 0 });
  });

  // Highlight the section you're reading: the last one whose top has passed under the top bar.
  // After a sidebar click, keep the clicked item highlighted until the jump finishes, because
  // short sections near the bottom can't scroll up to the top of the screen.
  var links = {}, ids = [], locked = null, settle;
  nav.querySelectorAll('.grp a[data-id]').forEach(function (a) {
    if (a.getAttribute('href').charAt(0) === '#' && document.getElementById(a.dataset.id)) { links[a.dataset.id] = a; ids.push(a.dataset.id); }
  });
  function setActive(id) {
    ids.forEach(function (k) { links[k].classList.toggle('active', k === id); });
  }
  function lockTo(id) {
    locked = id; setActive(id);
    clearTimeout(settle); settle = setTimeout(function () { locked = null; }, 1200);
  }
  function spy() {
    if (locked) return;
    var line = document.querySelector('.bar').getBoundingClientRect().bottom + 24;
    var cur = null;
    ids.forEach(function (id) { if (document.getElementById(id).getBoundingClientRect().top <= line) cur = id; });
    setActive(cur);
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (locked) { clearTimeout(settle); settle = setTimeout(function () { locked = null; }, 150); return; }
    if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; spy(); }); }
  }, { passive: true });
  var start = location.hash.slice(1);
  if (links[start]) lockTo(start); else spy();
})();

(function () {
  var toast = document.getElementById('toast'), t;
  function say(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(t); t = setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }
  function copy(text, btn, msg) {
    function done() { btn.classList.add('copied'); say(msg); setTimeout(function () { btn.classList.remove('copied'); }, 1500); }
    try {
      navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); });
    } catch (e) { fallback(text); done(); }
  }
  function fallback(text) {
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove();
  }

  // "Copy link" button on every section and sub-section heading with an id
  document.querySelectorAll('section[id] > h2, article h2[id], h3[id]').forEach(function (h) {
    var id = h.id || h.parentElement.id;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'anchor'; b.textContent = '# copy link';
    b.setAttribute('aria-label', 'Copy link to ' + h.textContent.trim());
    b.addEventListener('click', function () {
      var url = location.href.split('#')[0] + '#' + id;
      try { history.replaceState(null, '', '#' + id); } catch (e) {}
      copy(url, b, 'Link copied');
    });
    h.appendChild(b);
  });

  document.querySelectorAll('.copy[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () { copy(b.dataset.copy, b, 'Copied'); });
  });

  // If an image can't load, show a plain link instead
  document.querySelectorAll('figure img').forEach(function (img) {
    img.addEventListener('error', function () {
      var s = document.createElement('span'); s.className = 'img-fallback'; s.textContent = 'Open image: ' + (img.alt || 'screenshot');
      img.replaceWith(s);
    });
  });

})();
