// Lista archivos de categorías de Commons con tamaño y licencia.
// Uso: node tools/commons-cat.mjs "Plaza Huincul" "YPF"
const UA = { 'User-Agent': 'SchoolGeographyDeck/1.0 (student presentation)' };
for (const cat of process.argv.slice(2)) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=categorymembers&gcmtitle=${encodeURIComponent('Category:' + cat)}&gcmtype=file|subcat&gcmlimit=60&prop=imageinfo&iiprop=size|extmetadata&iiextmetadatafilter=LicenseShortName`;
  let r = {};
  for (let i = 0; i < 4; i++) {
    const t = await fetch(u, { headers: UA }).then((x) => x.text());
    try { r = JSON.parse(t); break; } catch { await new Promise((ok) => setTimeout(ok, 8000)); }
  }
  console.log('## ' + cat);
  Object.values(r.query?.pages || {}).forEach((p) => {
    const ii = p.imageinfo?.[0];
    console.log('  ', p.title, ii ? `${ii.width}x${ii.height} ${ii.extmetadata?.LicenseShortName?.value}` : '');
  });
  await new Promise((ok) => setTimeout(ok, 1500));
}
