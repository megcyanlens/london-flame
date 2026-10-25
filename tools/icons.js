// Render the PNG icons and link-preview image from the site's SVG logos.
const sharp = require('sharp');
const path = require('path');
const site = path.join(__dirname, '..', 'site');
const bg = '#141210';
const mark = path.join(site, 'favicon.svg');
const logo = path.join(site, 'images', 'logo.svg');

async function onBg(svg, w, h, innerW, out) {
  const art = await sharp(svg, { density: 1200 }).resize({ width: innerW }).png().toBuffer();
  const meta = await sharp(art).metadata();
  await sharp({ create: { width: w, height: h, channels: 4, background: bg } })
    .composite([{ input: art, left: Math.round((w - meta.width) / 2), top: Math.round((h - meta.height) / 2) }])
    .png({ compressionLevel: 9 }).toFile(out);
}

(async () => {
  await sharp(mark, { density: 600 }).resize(32, 32).png().toFile(path.join(site, 'favicon-32.png'));
  await onBg(mark, 180, 180, 136, path.join(site, 'apple-touch-icon.png'));
  await onBg(logo, 1200, 630, 760, path.join(site, 'images', 'og-image.png'));
  console.log('icons written');
})();
