#!/usr/bin/env node
// Gallery build for maddie.dog.
// Usage: npm run build  (Cloudflare git integration runs this on every deploy)
//
// - Scans www/static/assets/img/gallery/ for photos (jpg/jpeg/png/webp) and
//   passthrough media (gif/mp4).
// - Converts each photo to two WebP sizes with clean date slugs:
//     2025-07-04-a-grid.webp (~900px wide, for the grid)
//     2025-07-04-a-full.webp (~1800px wide, for the lightbox)
//   then REMOVES the original so only WebP deploys. (In Cloudflare's build
//   this happens in an ephemeral checkout — originals stay safe in git.
//   Running locally replaces originals in your working tree.)
// - Preserves captions/alt you've edited in gallery.json (matched by source
//   filename, so re-lettering can't orphan a caption).
// - Rewrites index.html between <!-- gallery:start --> / <!-- gallery:end -->.
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const GALLERY_DIR = path.join(__dirname, 'www', 'static', 'assets', 'img', 'gallery');
const INDEX_FILE = path.join(__dirname, 'www', 'static', 'index.html');
const DATA_FILE = path.join(GALLERY_DIR, 'gallery.json');
const QUALITY = 80;
const GRID_WIDTH = 900;
const FULL_WIDTH = 1800;
const SIZES_ATTR = '(max-width: 640px) 50vw, 340px';
const SOURCE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const PASS_EXT = { '.gif': 'image', '.mp4': 'video' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseDate(name) {
  let m = name.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/) || name.match(/(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
function monthYear(iso) {
  const [y, mo] = iso.split('-');
  return `${MONTHS[parseInt(mo, 10) - 1]} ${y}`;
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function slugBase(name) {
  return name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function isDerivative(f) {
  return /-(grid|full)\.webp$/.test(f);
}

async function main() {
  // Previous data — captions/alt keyed by source filename AND slug
  let prevBySource = {}, prevBySlug = {};
  if (fs.existsSync(DATA_FILE)) {
    try {
      for (const it of JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).items) {
        if (it.source) prevBySource[it.source] = it;
        if (it.slug) prevBySlug[it.slug] = it;
        if (it.file) prevBySource[it.file] = it; // legacy format
      }
    } catch (e) { console.warn('Could not parse existing gallery.json, starting fresh.'); }
  }

  const files = fs.readdirSync(GALLERY_DIR);
  const sources = files.filter((f) => SOURCE_EXT.includes(path.extname(f).toLowerCase()) && !isDerivative(f)).sort();
  const passthrough = files.filter((f) => PASS_EXT[path.extname(f).toLowerCase()]).sort();

  // Assign slugs: date + letter (a, b, c… per day, ordered by source name)
  const byDate = {};
  for (const f of sources) {
    const d = parseDate(f) || '';
    (byDate[d] = byDate[d] || []).push(f);
  }
  const slugOf = {};
  for (const [d, group] of Object.entries(byDate)) {
    group.forEach((f, i) => {
      const letter = String.fromCharCode(97 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
      slugOf[f] = d ? `${d}-${letter}` : slugBase(f);
    });
  }

  const items = [];
  // Already-converted photos: rebuild entries from existing -grid/-full.webp pairs
  const derivativeSlugs = [...new Set(files.filter(isDerivative).map((f) => f.replace(/-(grid|full)\.webp$/, '')))];
  const convertedSlugs = new Set(sources.map((f) => slugOf[f]));
  for (const slug of derivativeSlugs) {
    if (convertedSlugs.has(slug)) continue; // being converted this run
    const old = prevBySlug[slug] || {};
    const m = slug.match(/^(20\d{2}-\d{2}-\d{2})/);
    const date = old.date || (m ? m[1] : null);
    items.push({
      slug, source: old.source || null, type: 'image', date,
      caption: old.caption || '',
      alt: old.alt || `Maddie the goldendoodle${date ? ', ' + monthYear(date) : ''}`,
      gridW: old.gridW || GRID_WIDTH, fullW: old.fullW || FULL_WIDTH,
    });
  }

  for (const source of sources) {
    const slug = slugOf[source];
    const date = parseDate(source);
    const old = prevBySource[source] || prevBySlug[slug] || {};
    const gridFile = `${slug}-grid.webp`;
    const fullFile = `${slug}-full.webp`;
    const gridPath = path.join(GALLERY_DIR, gridFile);
    const fullPath = path.join(GALLERY_DIR, fullFile);
    const src = path.join(GALLERY_DIR, source);

    let gridW = old.gridW, fullW = old.fullW;
    if (!fs.existsSync(gridPath) || !fs.existsSync(fullPath)) {
      const img = sharp(src).rotate();
      gridW = (await img.clone().resize({ width: GRID_WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(gridPath)).width;
      fullW = (await img.clone().resize({ width: FULL_WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(fullPath)).width;
      console.log(`converted ${source} -> ${slug}-{grid,full}.webp`);
    }
    fs.unlinkSync(src); // originals do not deploy

    items.push({
      slug, source, type: 'image', date,
      caption: old.caption || '',
      alt: old.alt || `Maddie the goldendoodle${date ? ', ' + monthYear(date) : ''}`,
      gridW: gridW || GRID_WIDTH, fullW: fullW || FULL_WIDTH,
    });
  }

  for (const f of passthrough) {
    const date = parseDate(f);
    const old = prevBySource[f] || {};
    items.push({
      slug: slugBase(f), source: f, type: PASS_EXT[path.extname(f).toLowerCase()], date,
      caption: old.caption || '',
      alt: old.alt || `Maddie the goldendoodle${date ? ', ' + monthYear(date) : ''}`,
    });
  }

  items.sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    if (a.date) return -1;
    if (b.date) return 1;
    return a.slug.localeCompare(b.slug);
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify({ items }, null, 2) + '\n');

  const markup = items.map((it) => {
    if (it.type === 'video') {
      const src = 'assets/img/gallery/' + encodeURI(it.source);
      return `        <figure class="tile tile-video">\n          <video controls preload="metadata" playsinline src="${src}" aria-label="${escapeHtml(it.alt)}"></video>\n        </figure>`;
    }
    if (it.source && PASS_EXT[path.extname(it.source).toLowerCase()] === 'image') {
      const src = 'assets/img/gallery/' + encodeURI(it.source);
      const attrs = (it.caption ? ` data-caption="${escapeHtml(it.caption)}"` : '') + (it.date ? ` data-date="${it.date}"` : '');
      return `        <figure class="tile">\n          <a class="tile-link" href="${src}"${attrs}>\n            <img src="${src}" alt="${escapeHtml(it.alt)}" loading="lazy" decoding="async">\n          </a>\n        </figure>`;
    }
    const grid = `assets/img/gallery/${it.slug}-grid.webp`;
    const full = `assets/img/gallery/${it.slug}-full.webp`;
    const attrs = (it.caption ? ` data-caption="${escapeHtml(it.caption)}"` : '') + (it.date ? ` data-date="${it.date}"` : '');
    return `        <figure class="tile">\n          <a class="tile-link" href="${full}"${attrs}>\n            <img src="${grid}" srcset="${grid} ${it.gridW}w, ${full} ${it.fullW}w" sizes="${SIZES_ATTR}" alt="${escapeHtml(it.alt)}" loading="lazy" decoding="async">\n          </a>\n        </figure>`;
  }).join('\n');

  const html = fs.readFileSync(INDEX_FILE, 'utf8');
  fs.writeFileSync(INDEX_FILE, html.replace(
    /(<!-- gallery:start -->)[\s\S]*?(<!-- gallery:end -->)/,
    `$1\n${markup}\n        $2`
  ));
  console.log(`Gallery built: ${items.length} items (${sources.length} converted sources, ${passthrough.length} passthrough).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
