// patch-bar-dev.js
// 1) Bar lempar jadi tegak di samping karakter (hijau -> merah, penuh = mulai lagi), tombol "Lempar"
// 2) Balikin tombol Dev (auto fishing) yang JSX-nya hilang dari FishingGame.tsx
// Jalankan dari folder project:  node patch-bar-dev.js
const fs = require('fs');
const ENG = 'components/fishing/engine.ts';
const GAME = 'components/fishing/FishingGame.tsx';
const b64 = (x) => Buffer.from(x, 'base64').toString('utf8');
const BAR = b64('ICAgIGlmICh0aGlzLmNoYXJnaW5nICYmIHRoaXMucGhhc2UgPT09ICdpZGxlJykgewogICAgICAvLyBiYXIgdGVuYWdhIGxlbXBhcjogdGVnYWsgZGkgc2FtcGluZyBrYXJha3RlciwgaGlqYXUgKGRla2F0KSAtPiBtZXJhaCAoamF1aCkKICAgICAgY29uc3QgTiA9IDk7CiAgICAgIGNvbnN0IGNvbHMgPSBbJyM0YWRlODAnLCAnIzRhZGU4MCcsICcjNGFkZTgwJywgJyNhM2U2MzUnLCAnI2ZhY2MxNScsICcjZmI5MjNjJywgJyNmOTczMTYnLCAnI2VmNDQ0NCcsICcjZWY0NDQ0J107CiAgICAgIGNvbnN0IGJ3ID0gTWF0aC5tYXgoMTEgKiB1LCA0LjQgKiBTKTsKICAgICAgY29uc3QgYmggPSBNYXRoLm1heCg3NCAqIHUsIDMxICogUyk7CiAgICAgIGNvbnN0IGdhcCA9IE1hdGgubWF4KDEuNCAqIHUsIDAuNSAqIFMpOwogICAgICBjb25zdCBvZmYgPSBNYXRoLm1heCgxNCAqIHUsIDcgKiBTKTsKICAgICAgbGV0IGJ4ID0gc3hwICsgb2ZmOwogICAgICBpZiAoYnggKyBidyArIDggKiB1ID4gdGhpcy5jYW52YXMud2lkdGggLSA5NiAqIHUpIGJ4ID0gc3hwIC0gb2ZmIC0gYnc7IC8vIGRla2F0IHRvbWJvbCBha3NpIC0+IHBpbmRhaCBrZSBraXJpIGthcmFrdGVyCiAgICAgIGNvbnN0IGJ5ID0gc3lGZWV0IC0gYmggKyAzICogdTsKICAgICAgY29uc3QgcGFkID0gTWF0aC5tYXgoMi40ICogdSwgMC45ICogUyk7CiAgICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSgxOCwxNiwxNCwwLjg4KSc7CiAgICAgIHRoaXMucnJlY3QoYnggLSBwYWQsIGJ5IC0gcGFkLCBidyArIHBhZCAqIDIsIGJoICsgcGFkICogMiwgNSAqIHUpOwogICAgICBjdHguZmlsbCgpOwogICAgICBjdHguc3Ryb2tlU3R5bGUgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjIyKSc7CiAgICAgIGN0eC5saW5lV2lkdGggPSBNYXRoLm1heCgxLCB1ICogMC44KTsKICAgICAgY3R4LnN0cm9rZSgpOwogICAgICBjb25zdCBzaCA9IChiaCAtIGdhcCAqIChOIC0gMSkpIC8gTjsKICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBOOyBpKyspIHsKICAgICAgICBjb25zdCB5ID0gYnkgKyBiaCAtIChpICsgMSkgKiBzaCAtIGkgKiBnYXA7CiAgICAgICAgY29uc3QgbGl0ID0gdGhpcy5jaGFyZ2UgKiBOID4gaSArIDAuMTI7CiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGxpdCA/IGNvbHNbaV0gOiBjb2xzW2ldICsgJzMwJzsKICAgICAgICB0aGlzLnJyZWN0KGJ4LCB5LCBidywgc2gsIE1hdGgubWluKDMgKiB1LCBzaCAvIDIuNCkpOwogICAgICAgIGN0eC5maWxsKCk7CiAgICAgIH0KICAgICAgY29uc3QgdHIgPSB0aGlzLmNoYXJnZSA8IDAuMzQgPyAwIDogdGhpcy5jaGFyZ2UgPCAwLjY3ID8gMSA6IDI7CiAgICAgIHRoaXMucGlsbFRleHQoWydOb3JtYWwnLCAnU2VkYW5nJywgJ0phdWgnXVt0cl0sIGJ4ICsgYncgLyAyLCBieSAtIHBhZCAtIDEyICogdSwgc3ogKiAwLjksICdyZ2JhKDE4LDE2LDE0LDAuODUpJywgWycjNGFkZTgwJywgJyNmYWNjMTUnLCAnI2VmNDQ0NCddW3RyXSwgOCAqIHUpOwogICAgfQo=');
const DEV = b64('ICAgICAgey8qIERldiBUb29scyAoYXV0byBmaXNoaW5nIGRsbCk6IGhhbnlhIHJvbGUgRGV2ZWxvcGVyICovfQogICAgICB7ZGV2ICYmICgKICAgICAgICA8PgogICAgICAgICAgPERldkZhYiBweD17cHh9IHJvdD17cm90fSBnZXRXcmFwPXsoKSA9PiB3cmFwUmVmLmN1cnJlbnR9IGF1dG89e2F1dG99IGNvdW50PXtkc3RhdHMuY2F0Y2hlc30gb3Blbj17ZGV2T3Blbn0gb25UYXA9eygpID0+IHNldERldk9wZW4oKG8pID0+ICFvKX0gLz4KICAgICAgICAgIHtkZXZPcGVuICYmICgKICAgICAgICAgICAgPERldlRvb2xzCiAgICAgICAgICAgICAgcHg9e3B4fSByb3Q9e3JvdH0gZ2V0V3JhcD17KCkgPT4gd3JhcFJlZi5jdXJyZW50fSBlbmdpbmU9e2VuZ2luZVJlZi5jdXJyZW50fQogICAgICAgICAgICAgIGF1dG89e2F1dG99IG9uQXV0bz17KG9uKSA9PiBlbmdpbmVSZWYuY3VycmVudD8uc2V0QXV0byhvbil9CiAgICAgICAgICAgICAgc2VsbE1vZGU9e3NlbGxNb2RlfSBzZXRTZWxsTW9kZT17c2V0U2VsbE1vZGV9CiAgICAgICAgICAgICAgc3BlZWQ9e3NwZWVkfSBzZXRTcGVlZD17c2V0U3BlZWR9IGluc3RhbnQ9e2luc3RhbnR9IHNldEluc3RhbnQ9e3NldEluc3RhbnR9CiAgICAgICAgICAgICAgZm9yY2U9e2ZvcmNlfSBzZXRGb3JjZT17c2V0Rm9yY2V9IGZvcmNlU2l6ZT17Zm9yY2VTaXplfSBzZXRGb3JjZVNpemU9e3NldEZvcmNlU2l6ZX0KICAgICAgICAgICAgICBzdGF0cz17ZHN0YXRzfSByZXNldFN0YXRzPXsoKSA9PiBzZXREc3RhdHMoeyAuLi5FTVBUWV9TVEFUUyB9KX0KICAgICAgICAgICAgICBvbkNsb3NlPXsoKSA9PiBzZXREZXZPcGVuKGZhbHNlKX0KICAgICAgICAgICAgLz4KICAgICAgICAgICl9CiAgICAgICAgPC8+CiAgICAgICl9Cgo=');
function stop(m) { console.log('GAGAL: ' + m + '\nTidak ada file yang diubah.'); process.exit(1); }
for (const f of [ENG, GAME]) if (!fs.existsSync(f)) stop(f + ' tidak ada. Jalankan dari folder ~/komikita.');
let e = fs.readFileSync(ENG, 'utf8'), g = fs.readFileSync(GAME, 'utf8');
const e0 = e, g0 = g;
const log = [];

// ---- engine: charge naik terus, penuh = mulai lagi ----
const bounce = /        this\.charge \+= dt \* 0\.9 \* this\.chargeDir;\n        if \(this\.charge >= 1\) \{ this\.charge = 1; this\.chargeDir = -1; \}\n        else if \(this\.charge <= 0\) \{ this\.charge = 0; this\.chargeDir = 1; \}\n/;
if (bounce.test(e)) { e = e.replace(bounce, "        this.charge += dt * 0.85; // penuh = mulai lagi dari bawah\n        if (this.charge >= 1) this.charge = 0;\n"); log.push('charge: penuh = mulai lagi'); }
else if (e.includes('penuh = mulai lagi dari bawah')) log.push('charge: sudah dipatch');
else stop('blok charge di engine.ts tidak ketemu (struktur beda).');

// ---- engine: bar tegak ----
const barRe = /    if \(this\.charging && this\.phase === 'idle'\) \{[\s\S]*?\n    \}\n(?=    \/\/ label warung dan ikan raksasa)/;
if (e.includes('bar tenaga lempar: tegak')) log.push('bar tegak: sudah dipatch');
else if (barRe.test(e)) { e = e.replace(barRe, () => BAR); log.push('bar tegak dipasang'); }
else stop('blok bar lempar di drawTags (engine.ts) tidak ketemu.');

// ---- FishingGame: label & petunjuk ----
if (g.includes("phase === 'idle' ? 'Joran'")) { g = g.replace("phase === 'idle' ? 'Joran'", "phase === 'idle' ? 'Lempar'"); log.push("tombol: 'Lempar'"); }
const oldHint = "'Hadapkan ke air, tahan Joran buat atur jarak lempar'";
if (g.includes(oldHint)) { g = g.replace(oldHint, "'Hadapkan ke air, tahan Lempar. Lepas saat bar tinggi = lemparan jauh (penuh = mulai lagi)'"); log.push('petunjuk diganti'); }

// ---- FishingGame: Dev Tools ----
if (/<DevFab\b/.test(g)) log.push('Dev Tools: sudah ada');
else {
  for (const id of ['DevFab', 'DevTools', 'devOpen', 'dstats', 'setDstats', 'sellMode', 'instant', 'forceSize', 'const dev = ']) if (!g.includes(id)) stop('"' + id + '" tidak ada di FishingGame.tsx, Dev Tools tidak bisa dipasang.');
  const at = g.search(/^[ \t]*\{\/\* hasil tangkapan/m);
  if (at < 0) stop('titik pasang Dev Tools ("hasil tangkapan") tidak ketemu.');
  g = g.slice(0, at) + DEV + g.slice(at);
  log.push('Dev Tools (tombol 🛠️) dipasang lagi');
}

if (e !== e0) { fs.writeFileSync(ENG + '.bak', e0); fs.writeFileSync(ENG, e); }
if (g !== g0) { fs.writeFileSync(GAME + '.bak2', g0); fs.writeFileSync(GAME, g); }
console.log('OK:\n- ' + log.join('\n- '));
