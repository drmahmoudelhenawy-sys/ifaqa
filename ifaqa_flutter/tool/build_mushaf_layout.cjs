// Builds assets/mushaf/pages/NNN.json (Madinah Mushaf line layout, QCF v2 glyphs)
// from the quran.com API. Usage: node tool/build_mushaf_layout.cjs
// Page file: {"p":N,"l":[[lineNo,[[surah,ayah,position,isEnd,code_v2,text_uthmani],...]],...]}
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'mushaf', 'pages');
const WORKERS = 4;

async function fetchPage(page) {
  const url = `https://api.quran.com/api/v4/verses/by_page/${page}?words=true&word_fields=code_v2,line_number,text_uthmani&per_page=50&fields=v2_page`;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      if (attempt === 6) throw e;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

function convert(page, json) {
  const lines = new Map();
  for (const v of json.verses) {
    const [s, a] = v.verse_key.split(':').map(Number);
    for (const w of v.words) {
      if (w.page_number && w.page_number !== page) continue;
      const isEnd = w.char_type_name === 'end';
      const row = [s, a, w.position, isEnd ? 1 : 0, w.code_v2];
      if (!isEnd) row.push(w.text_uthmani || '');
      if (!lines.has(w.line_number)) lines.set(w.line_number, []);
      lines.get(w.line_number).push(row);
    }
  }
  const l = [...lines.entries()].sort((x, y) => x[0] - y[0]);
  return { p: page, l };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let next = 1, done = 0, total = 0;
  async function worker() {
    while (next <= 604) {
      const page = next++;
      const file = path.join(OUT, String(page).padStart(3, '0') + '.json');
      if (fs.existsSync(file)) { done++; total += fs.statSync(file).size; continue; }
      const data = convert(page, await fetchPage(page));
      const text = JSON.stringify(data);
      fs.writeFileSync(file, text);
      total += Buffer.byteLength(text);
      if (++done % 50 === 0) console.log(done + '/604');
    }
  }
  await Promise.all(Array.from({ length: WORKERS }, worker));
  console.log('done, bytes:', total);
})().catch((e) => { console.error(e); process.exit(1); });
