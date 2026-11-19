// Stamp every page's links to site.css / *.js with a version based on the file's contents,
// e.g. site.css?v=3fa9c1d2. Browsers keep CSS/JS for hours, so without this people can see
// a new page with an old script. Run before every deploy: node tools/bust-cache.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const site = path.join(__dirname, '..', 'site');
const version = {};
for (const f of fs.readdirSync(site)) {
  if (/\.(css|js)$/.test(f)) {
    version[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(site, f))).digest('hex').slice(0, 8);
  }
}

let changed = 0;
for (const f of fs.readdirSync(site).filter((n) => n.endsWith('.html'))) {
  const file = path.join(site, f);
  const before = fs.readFileSync(file, 'utf8');
  // matches href="site.css", src="/site.js", src="what-helps.js?v=old" ...
  const after = before.replace(/((?:href|src)=")(\/?)([\w-]+\.(?:css|js))(?:\?v=[\w]+)?(")/g, (m, attr, slash, name, end) =>
    version[name] ? `${attr}${slash}${name}?v=${version[name]}${end}` : m);
  if (after !== before) { fs.writeFileSync(file, after); changed++; }
}
console.log(`Versioned ${Object.keys(version).join(', ')} in ${changed} page(s).`);
