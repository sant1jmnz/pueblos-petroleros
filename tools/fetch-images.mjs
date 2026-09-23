// Baja fotos de Wikimedia Commons a assets/img/<clave>.jpg (1600px máx) y
// guarda autor/licencia/URL en assets/credits.js (lo lee la slide de créditos).
// Uso: NODE_PATH=<carpeta con sharp>/node_modules node tools/fetch-images.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp'); // require() respeta NODE_PATH, import no

const UA = { 'User-Agent': 'SchoolGeographyDeck/1.0 (https://github.com/sant1jmnz/pueblos-petroleros)' };
const OUT = new URL('../assets/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const IMAGES = JSON.parse(fs.readFileSync(new URL('./images.json', import.meta.url)));

const creditsFile = `${OUT}credits.js`;
const credits = fs.existsSync(creditsFile) ? JSON.parse(fs.readFileSync(creditsFile, 'utf8').replace(/^window\.CREDITS=|;\s*$/g, '')) : {};
fs.mkdirSync(`${OUT}img`, { recursive: true });

for (const [key, title] of Object.entries(IMAGES)) {
  const dest = `${OUT}img/${key}.jpg`;
  if (fs.existsSync(dest) && credits[key]?.title === title) continue;
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent('File:' + title)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280&iiextmetadatafilter=LicenseShortName|Artist`;
  let info;
  for (let i = 0; i < 5 && !info; i++) {
    const t = await fetch(api, { headers: UA }).then((r) => r.text());
    try { info = Object.values(JSON.parse(t).query.pages)[0].imageinfo[0]; } catch { await sleep(8000); }
  }
  if (!info) { console.warn('SIN INFO', key, title); continue; }
  let ok = false;
  for (const src of [info.thumburl, info.url]) {
    for (let i = 0; i < 4 && !ok; i++) {
      const res = await fetch(src, { headers: UA });
      if (res.status === 429) { console.warn('429', key); await sleep(20000); continue; }
      if (!res.ok) { console.warn('http', res.status, key); break; }
      try {
        await sharp(Buffer.from(await res.arrayBuffer())).rotate().flatten({ background: '#ffffff' }).resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 74, mozjpeg: true }).toFile(dest);
        ok = true;
      } catch (e) { console.warn('reintento', key, e.message); await sleep(5000); }
    }
    if (ok) break;
  }
  if (!ok) { console.warn('FALLÓ', key); continue; }
  credits[key] = { title, artist: strip(info.extmetadata?.Artist?.value), license: info.extmetadata?.LicenseShortName?.value || '', url: info.descriptionurl };
  fs.writeFileSync(creditsFile, 'window.CREDITS=' + JSON.stringify(credits, null, 1) + ';');
  console.log('ok', key, credits[key].license);
  await sleep(2500);
}
