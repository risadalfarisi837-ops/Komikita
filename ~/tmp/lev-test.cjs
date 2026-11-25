"use strict";

// lib/fishing.ts
var SPECIES = [
  { id: "teri", name: "Teri Pasir", rarity: "common", min: 3e-3, max: 0.015, price: 4, shape: "long", body: "#cfd8dc", belly: "#eceff1", fin: "#b0bec5", pattern: "none", accent: "#90a4ae" },
  { id: "kembung", name: "Kembung Biru", rarity: "common", min: 0.08, max: 0.25, price: 10, shape: "oval", body: "#4f8fbf", belly: "#cfe8f7", fin: "#356a94", pattern: "stripes", accent: "#2b4f73" },
  { id: "selar", name: "Selar Kuning", rarity: "common", min: 0.1, max: 0.3, price: 12, shape: "oval", body: "#e6c24a", belly: "#fff3b0", fin: "#c9a227", pattern: "band", accent: "#8a6d0f" },
  { id: "baronang", name: "Baronang Belang", rarity: "common", min: 0.2, max: 0.6, price: 16, shape: "round", body: "#8bbf6a", belly: "#e6f4d3", fin: "#5e9444", pattern: "stripes", accent: "#3d6b2b" },
  { id: "kakap", name: "Kakap Merah", rarity: "uncommon", min: 0.8, max: 2.5, price: 36, shape: "oval", body: "#e0584d", belly: "#ffd4cf", fin: "#b83a30", pattern: "none", accent: "#8f2a22" },
  { id: "tongkol", name: "Tongkol Perak", rarity: "uncommon", min: 1, max: 3, price: 40, shape: "long", body: "#6c8ea8", belly: "#dbe7ef", fin: "#4a6a82", pattern: "stripes", accent: "#3b546a" },
  { id: "buntal", name: "Buntal Duri", rarity: "uncommon", min: 0.3, max: 1, price: 46, shape: "round", body: "#e9b86a", belly: "#fff0d2", fin: "#c08a3e", pattern: "spots", accent: "#8a5a1c" },
  { id: "kerapu", name: "Kerapu Macan", rarity: "rare", min: 3, max: 9, price: 110, shape: "big", body: "#b9835a", belly: "#f1d9c0", fin: "#8b5b38", pattern: "spots", accent: "#5b3a22" },
  { id: "pari", name: "Pari Elang", rarity: "rare", min: 5, max: 14, price: 150, shape: "flat", body: "#5f7fa6", belly: "#d9e5f2", fin: "#3f5c82", pattern: "spots", accent: "#e8f1ff" },
  { id: "lentera", name: "Ikan Lentera", rarity: "rare", min: 0.5, max: 2.2, price: 130, shape: "round", body: "#3b3f77", belly: "#6b70b8", fin: "#272b57", pattern: "spots", accent: "#7df9ff", glow: true },
  { id: "tuna", name: "Tuna Sirip Biru", rarity: "epic", min: 30, max: 90, price: 360, shape: "long", body: "#2f5fa8", belly: "#cfe0f5", fin: "#f2c230", pattern: "stripes", accent: "#1d3f78" },
  { id: "marlin", name: "Marlin Senja", rarity: "epic", min: 60, max: 180, price: 480, shape: "long", body: "#3a8fa8", belly: "#d6f0f6", fin: "#ff9a62", pattern: "band", accent: "#ff9a62" },
  { id: "bulan", name: "Ikan Bulan Emas", rarity: "legendary", min: 200, max: 900, price: 1200, shape: "round", body: "#ffd24a", belly: "#fff1b8", fin: "#ffb300", pattern: "spots", accent: "#fff8d6", glow: true },
  { id: "paus", name: "Paus Kristal", rarity: "legendary", min: 500, max: 1500, price: 1800, shape: "big", body: "#58c7ff", belly: "#e0f7ff", fin: "#2f9bdc", pattern: "spots", accent: "#ffffff", glow: true },
  { id: "hiu", name: "Hiu Raksasa", rarity: "legendary", min: 400, max: 1800, price: 2600, shape: "shark", body: "#6b7f94", belly: "#eef3f7", fin: "#52657a", pattern: "none", accent: "#3d4d5f", glow: true, eventOnly: true },
  { id: "leviathan", name: "Leviathan", rarity: "legendary", min: 9e3, max: 22e3, price: 24e3, shape: "big", body: "#23407a", belly: "#6fb7ff", fin: "#7b5cff", pattern: "spots", accent: "#7df9ff", glow: true, eventOnly: true }
];
var SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
var RODS = [
  { id: "default", name: "Joran Kayu", rarity: "common", power: 1, luck: 0, money: 0, xp: 0, price: 0 },
  { id: "fiber", name: "Joran Fiber", rarity: "common", power: 2, luck: 0.06, money: 0.08, xp: 0.08, price: 300 },
  { id: "karbon", name: "Joran Karbon", rarity: "uncommon", power: 3, luck: 0.14, money: 0.16, xp: 0.16, price: 900 },
  { id: "perak", name: "Joran Perak Laut", rarity: "rare", power: 4, luck: 0.24, money: 0.26, xp: 0.26, price: 2400 },
  { id: "emas", name: "Joran Emas Samudra", rarity: "epic", power: 5, luck: 0.36, money: 0.38, xp: 0.36, price: 6e3 },
  { id: "kristal", name: "Joran Kristal Badai", rarity: "epic", power: 6, luck: 0.46, money: 0.44, xp: 0.42, price: 0, gachaOnly: true },
  { id: "bulan", name: "Joran Bulan Purnama", rarity: "legendary", power: 7, luck: 0.6, money: 0.55, xp: 0.5, price: 0, gachaOnly: true },
  { id: "naga", name: "Joran Naga Laut", rarity: "legendary", power: 8, luck: 0.75, money: 0.68, xp: 0.6, price: 0, gachaOnly: true }
];
var RODS_BY_ID = Object.fromEntries(RODS.map((r) => [r.id, r]));
var GACHA_PRICE = 500;
var GACHA_DUPLICATE_REFUND = Math.round(GACHA_PRICE * 0.5);
var GACHA_POOL = RODS.filter((r) => r.gachaOnly).map((r) => ({
  rod: r,
  weight: r.id === "naga" ? 6 : r.id === "bulan" ? 16 : 60
}));
var BAITS = [
  { id: "cacing", name: "Cacing Tanah", price: 15, luck: 0.15, emoji: "\u{1FAB1}", desc: "Umpan dasar" },
  { id: "udang", name: "Udang Segar", price: 45, luck: 0.4, emoji: "\u{1F990}", desc: "Disukai ikan sedang" },
  { id: "teri", name: "Teri Wangi", price: 120, luck: 0.9, emoji: "\u{1F41F}", desc: "Baunya memanggil ikan langka" },
  { id: "emas", name: "Umpan Emas", price: 350, luck: 1.8, emoji: "\u2728", desc: "Peluang epik & legendary naik besar" }
];
var BAITS_BY_ID = Object.fromEntries(BAITS.map((b) => [b.id, b]));

// components/fishing/art.ts
var TILE = 16;
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function mk(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function R(ctx, x, y, w, h, col) {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
var MAP_W = 36;
var MAP_H = 40;
var WATER_COLORS = ["#6fd0ea", "#5cc2e4", "#4cb1dc", "#3c9fd3", "#2f88c5", "#2872b4"];
function generateWorld(seed = 11) {
  const rnd = mulberry32(seed);
  const W = MAP_W;
  const H = MAP_H;
  const land = [];
  const pond = [];
  const cx = 14.5;
  const cy = 12.5;
  const rx = 16;
  const ry = 12;
  for (let y = 0; y < H; y++) {
    land[y] = [];
    pond[y] = [];
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      const th = Math.atan2(dy, dx);
      const edge = 1 + 0.1 * Math.sin(3 * th + 1.3) + 0.07 * Math.sin(5 * th + 0.4) + 0.05 * Math.sin(8 * th + 2.1);
      land[y][x] = d < edge * 0.98 || x <= 1 || y <= 1;
      const px = (x - 8.5) / 3.3;
      const py2 = (y - 16) / 2.4;
      pond[y][x] = px * px + py2 * py2 < 1;
      if (pond[y][x]) land[y][x] = false;
    }
  }
  const INF = 99;
  const dl = [];
  const dw = [];
  for (let y = 0; y < H; y++) {
    dl[y] = Array(W).fill(INF);
    dw[y] = Array(W).fill(INF);
  }
  const bfs = (dist, src) => {
    const q = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (src(x, y)) {
      dist[y][x] = 0;
      q.push([x, y]);
    }
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ax;
        const ny = y + ay;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (dist[ny][nx] > dist[y][x] + 1) {
          dist[ny][nx] = dist[y][x] + 1;
          q.push([nx, ny]);
        }
      }
    }
  };
  bfs(dl, (x, y) => land[y][x]);
  bfs(dw, (x, y) => !land[y][x]);
  const hash = (x, y) => {
    const n2 = Math.sin(x * 127.1 + y * 311.7 + seed * 17.3) * 43758.5453;
    return n2 - Math.floor(n2);
  };
  const vnoise = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const n00 = hash(xi, yi);
    const n10 = hash(xi + 1, yi);
    const n01 = hash(xi, yi + 1);
    const n11 = hash(xi + 1, yi + 1);
    return n00 + (n10 - n00) * u + (n01 - n00) * v + (n00 - n10 - n01 + n11) * u * v;
  };
  const tiles = [];
  for (let y = 0; y < H; y++) {
    tiles[y] = [];
    for (let x = 0; x < W; x++) {
      if (land[y][x]) {
        const n2 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
        const frac = n2 < 0 ? n2 + 1 : n2;
        const beach = dw[y][x] <= 1 || dw[y][x] === 2 && frac < 0.45;
        tiles[y][x] = beach ? "sand" : dw[y][x] >= 3 && vnoise(x / 4.2, y / 4.2) > 0.6 ? "grass" : "sand";
      } else {
        tiles[y][x] = dl[y][x] <= 2 ? "shallow" : "deep";
      }
    }
  }
  const sy = 13;
  let shoreX = Math.round(cx);
  while (shoreX < W - 1 && land[sy][shoreX]) shoreX++;
  const start = { x: shoreX - 5, y: sy };
  const pathPts = [
    [2.5, sy - 6],
    [start.x - 17, sy - 3],
    [start.x - 12, sy + 1.5],
    [start.x - 7, sy - 0.5],
    [start.x - 3, sy + 2],
    [start.x + 1, sy],
    [shoreX - 2.4, sy + 1.2]
  ];
  for (let i = 0; i + 1 < pathPts.length; i++) {
    const [x0, y0] = pathPts[i];
    const [x1, y1] = pathPts[i + 1];
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4);
    for (let k = 0; k <= steps; k++) {
      const f = k / steps;
      const wob = Math.sin(i * 7 + f * 5) * 0.35;
      const px = x0 + (x1 - x0) * f;
      const py2 = y0 + (y1 - y0) * f + wob;
      const rad = 1.05 + 0.3 * Math.sin(f * 6 + i);
      for (let ty = Math.floor(py2 - 2); ty <= Math.ceil(py2 + 2); ty++) {
        for (let tx = Math.floor(px - 2); tx <= Math.ceil(px + 2); tx++) {
          if (tx < 2 || ty < 2 || tx >= W || ty >= H || !land[ty][tx] || dw[ty][tx] < 2) continue;
          if ((tx + 0.5 - px) ** 2 + (ty + 0.5 - py2) ** 2 < rad * rad) tiles[ty][tx] = "dirt";
        }
      }
    }
  }
  const py = sy + 3;
  let pierX = Math.round(cx);
  while (pierX < W - 1 && land[py][pierX]) pierX++;
  const pierTiles = [];
  for (let i = 0; i < 6; i++) {
    for (const yy of [py, py + 1]) {
      const xx = pierX + i;
      if (xx < W && !land[yy][xx]) {
        tiles[yy][xx] = "plank";
        pierTiles.push([xx, yy]);
      }
    }
  }
  const near = (x, y, ax, ay, r) => Math.abs(x - ax) + Math.abs(y - ay) <= r;
  const props = [];
  const occ = [];
  for (let y = 0; y < H; y++) occ[y] = Array(W).fill(false);
  const place = (kind, x, y) => {
    props.push({ kind, x, y, v: rnd() });
    occ[y][x] = true;
  };
  const walkable = (x, y) => x > 1 && y > 1 && x < W && y < H && (tiles[y][x] === "sand" || tiles[y][x] === "grass" || tiles[y][x] === "dirt") && !occ[y][x];
  const putBlock = (kind, cands, w, h, extra = {}) => {
    for (const [bx, by] of cands) {
      let ok2 = true;
      for (let yy = by; yy < by + h && ok2; yy++) {
        for (let xx = bx; xx < bx + w; xx++) {
          if (!walkable(xx, yy) || near(xx, yy, start.x, start.y, 1)) {
            ok2 = false;
            break;
          }
        }
      }
      if (!ok2) continue;
      props.push({ kind, x: bx, y: by, v: rnd(), w, h, ...extra });
      for (let yy = by; yy < by + h; yy++) for (let xx = bx; xx < bx + w; xx++) occ[yy][xx] = true;
      return [bx, by];
    }
    return null;
  };
  const sx = start.x;
  putBlock("fountain", [[sx - 1, sy - 9], [sx - 3, sy - 9], [sx + 1, sy - 8], [sx - 5, sy - 9], [sx - 2, sy - 10], [sx - 7, sy - 9]], 4, 3);
  putBlock("shop", [[13, 10], [12, 10], [14, 10], [13, 9], [12, 9], [14, 9], [13, 11], [11, 10], [15, 10], [12, 11], [14, 11], [10, 10], [16, 10]], 4, 3, { name: "Toko Mancing", role: "Umpan \xB7 Joran \xB7 Jual Ikan" });
  const tbl = putBlock("table", [[sx - 8, sy - 3], [sx - 7, sy - 4], [sx - 9, sy - 3], [sx - 8, sy - 5]], 2, 1);
  if (tbl) {
    putBlock("stool", [[tbl[0] - 1, tbl[1]]], 1, 1);
    putBlock("stool", [[tbl[0] + 2, tbl[1]]], 1, 1);
  }
  putBlock("bench", [[sx - 13, sy - 5], [sx - 12, sy - 6], [sx - 14, sy - 4], [sx - 12, sy - 3]], 3, 1);
  putBlock("sign", [[sx - 5, sy + 4], [sx - 4, sy + 4], [sx - 5, sy + 3], [sx - 6, sy + 4]], 1, 1);
  putBlock("lamp", [[sx - 8, sy + 4], [sx - 9, sy + 4], [sx - 8, sy + 3]], 1, 1);
  putBlock("lamp", [[sx - 1, sy + 4], [sx, sy + 4], [sx - 1, sy + 3]], 1, 1);
  putBlock("npc", [[sx + 3, sy - 2], [sx + 3, sy - 3], [sx + 2, sy - 2], [sx + 2, sy - 3]], 1, 1, { name: "Pak Bayu", role: "Pemancing" });
  for (const c of [[sx + 6, sy - 3], [sx + 7, sy - 1], [sx + 5, sy - 6], [sx - 11, sy + 1], [sx - 3, sy - 7], [sx + 4, sy - 7], [sx - 15, sy - 1], [sx - 10, sy - 6]]) {
    putBlock("bush", [c], 1, 1);
  }
  const spotOk = (bx, by, w, h) => {
    for (let yy = by; yy < by + h; yy++) {
      for (let xx = bx; xx < bx + w; xx++) {
        if (xx < 3 || yy < 3 || xx >= W - 1 || yy >= H - 1 || !walkable(xx, yy) || dw[yy][xx] < 2 || near(xx, yy, start.x, start.y, 2)) return false;
      }
    }
    return true;
  };
  const stalls = [];
  const bestSpot = (tx, ty, w, h, minFar) => {
    let best = null;
    let bd = 1e9;
    for (let by = 3; by < H - 3; by++) {
      for (let bx = 3; bx < W - 3; bx++) {
        if (!spotOk(bx, by, w, h)) continue;
        const cxx = bx + w / 2;
        const cyy = by + h / 2;
        let far = true;
        for (const o of [...stalls, ...props.filter((q) => q.kind === "shop" || q.kind === "fountain")]) {
          if (Math.hypot(cxx - (o.x + (o.w || 1) / 2), cyy - (o.y + (o.h || 1) / 2)) < minFar) {
            far = false;
            break;
          }
        }
        if (!far) continue;
        const d = Math.hypot(cxx - tx, cyy - ty);
        if (d < bd) {
          bd = d;
          best = [bx, by];
        }
      }
    }
    return best;
  };
  const stallDefs = [
    { name: "Warung Ikan Bakar", role: "Makanan", t: [sx - 9, sy - 5], variant: 0 },
    { name: "Toko Umpan", role: "Cacing \xB7 Udang", t: [sx - 3, sy - 7], variant: 1 },
    { name: "Toko Hiasan", role: "Lentera \xB7 Kerang", t: [sx - 6, sy + 4], variant: 2 },
    { name: "Kedai Kelapa", role: "Minuman", t: [sx - 14, sy - 1], variant: 3 }
  ];
  for (const d of stallDefs) {
    const at = bestSpot(d.t[0], d.t[1], 3, 2, 6);
    if (!at) continue;
    const pr = { kind: "stall", x: at[0], y: at[1], v: d.variant + rnd() * 0.9, w: 3, h: 2, name: d.name, role: d.role };
    props.push(pr);
    stalls.push(pr);
    for (let yy = at[1]; yy < at[1] + 2; yy++) for (let xx = at[0]; xx < at[0] + 3; xx++) occ[yy][xx] = true;
    if (spotOk(at[0] + 3, at[1] + 1, 1, 1)) place("barrel", at[0] + 3, at[1] + 1);
    if (spotOk(at[0] - 1, at[1] + 1, 1, 1)) place("crate", at[0] - 1, at[1] + 1);
  }
  for (const c of [[pierX - 5, py - 3], [pierX - 5, py + 4], [pierX - 7, py - 3], [pierX - 7, py + 4]]) {
    if (spotOk(c[0], c[1], 2, 1)) {
      putBlock("net", [c], 2, 1);
      break;
    }
  }
  let umb = 0;
  const umbs = [];
  for (let k = 0; k < 400 && umb < 5; k++) {
    const ux = 3 + Math.floor(rnd() * (W - 8));
    const uy = 3 + Math.floor(rnd() * (H - 8));
    if (tiles[uy][ux] !== "sand" || dw[uy][ux] < 2 || dw[uy][ux] > 3 || !spotOk(ux, uy, 1, 1)) continue;
    if (umbs.some(([a, b]) => Math.hypot(a - ux, b - uy) < 7)) continue;
    umbs.push([ux, uy]);
    place("umbrella", ux, uy);
    umb++;
  }
  let fl = 0;
  for (let k = 0; k < 900 && fl < 34; k++) {
    const fx = 3 + Math.floor(rnd() * (W - 8));
    const fy = 3 + Math.floor(rnd() * (H - 8));
    if (tiles[fy][fx] !== "grass" || occ[fy][fx] || dw[fy][fx] < 3) continue;
    props.push({ kind: "flowers", x: fx, y: fy, v: rnd() });
    fl++;
  }
  const boats = [];
  for (let by = H - 14; by > 6 && boats.length < 2; by--) {
    for (let bx = 4; bx < W - 6 && boats.length < 2; bx++) {
      if (tiles[by][bx] === "shallow" && tiles[by][bx + 1] === "shallow" && tiles[by][bx + 2] === "shallow" && dl[by][bx] <= 2 && !pierTiles.some(([a, b]) => Math.abs(a - bx) < 4 && Math.abs(b - by) < 3) && !boats.some(([a, b]) => Math.hypot(a - bx, b - by) < 9)) {
        boats.push([bx, by]);
        props.push({ kind: "boat", x: bx, y: by, v: rnd(), w: 2, h: 1 });
      }
    }
  }
  let deckX = Math.round(cx) - 1;
  let deckY = H - 12;
  while (deckY > 0 && !land[deckY][deckX]) deckY--;
  for (let i = 1; i <= 5; i++) {
    for (const xx of [deckX, deckX + 1]) {
      const yy = deckY + i;
      if (yy < H && !land[yy][xx]) {
        tiles[yy][xx] = "plank";
        pierTiles.push([xx, yy]);
      }
    }
  }
  const fishW = 16;
  const fishH = 6;
  props.push({ kind: "giantfish", x: Math.max(1, Math.round(cx) - 8), y: Math.min(H - fishH - 1, deckY + 7), v: rnd(), w: fishW, h: fishH, name: "Ikan Raksasa Pulau", role: "Pamer di sini!" });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = tiles[y][x];
      if (t !== "grass" && t !== "sand") continue;
      if (near(x, y, start.x, start.y, 3) || near(x, y, pierX - 1, py, 3) || near(x, y, pierX - 1, py + 1, 3)) continue;
      if (x === 0 || y === 0 || occ[y][x]) continue;
      const neighOcc = occ[y][x - 1] || occ[y - 1][x] || x + 1 < W && occ[y - 1][x + 1] || occ[y - 1][x - 1];
      if (x === 1 || y === 1) {
        if (rnd() < 0.85) place("palm", x, y);
        continue;
      }
      if (t === "grass") {
        const pp = dw[y][x] >= 3 ? 0.07 : 0.1;
        if (!neighOcc && rnd() < pp) place("palm", x, y);
      } else if (dw[y][x] >= 3 && rnd() < 0.035 && !neighOcc) {
        place("palm", x, y);
      } else if (rnd() < 0.03 && !neighOcc) {
        place("rock", x, y);
      }
    }
  }
  const lampSpots = [[pierX - 1, py - 1], [pierX - 1, py + 2]];
  for (const [lx, ly] of lampSpots) {
    if (ly > 0 && ly < H && (tiles[ly][lx] === "sand" || tiles[ly][lx] === "grass") && !occ[ly][lx]) place("lamp", lx, ly);
  }
  const blocked = [];
  for (let y = 0; y < H; y++) {
    blocked[y] = [];
    for (let x = 0; x < W; x++) {
      const t = tiles[y][x];
      blocked[y][x] = t === "deep" || t === "shallow" || occ[y][x] || x === 0 || y === 0;
    }
  }
  const world2 = { w: W, h: H, tiles, blocked, props, start, terrain: mk(W * TILE, H * TILE) };
  renderTerrain(world2, dl, pond, pierTiles, seed);
  return world2;
}
function renderTerrain(world2, dl, pond, pier, seed) {
  const ctx = world2.terrain.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const { w, h, tiles } = world2;
  const isLand = (x, y) => x >= 0 && y >= 0 && x < w && y < h && (tiles[y][x] === "sand" || tiles[y][x] === "grass");
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const rnd = mulberry32(seed * 7919 + ty * 131 + tx * 17);
      const X = tx * TILE;
      const Y = ty * TILE;
      const t = tiles[ty][tx];
      if (t === "grass") {
        R(ctx, X, Y, TILE, TILE, "#5fae5b");
        for (let i = 0; i < 7; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, "#4c9a4f");
        for (let i = 0; i < 5; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, "#7bc66d");
        for (let i = 0; i < 2; i++) {
          const bx = X + 1 + rnd() * 13;
          const by = Y + 2 + rnd() * 12;
          R(ctx, bx, by, 1, 2, "#3f8a45");
          R(ctx, bx + 1, by - 1, 1, 1, "#3f8a45");
        }
        if (rnd() < 0.13) {
          const cols = ["#fff6a0", "#ff9ec8", "#ffffff", "#ffb36b"];
          const c = cols[Math.floor(rnd() * cols.length)];
          const fx = X + 3 + Math.floor(rnd() * 9);
          const fy = Y + 3 + Math.floor(rnd() * 9);
          R(ctx, fx, fy + 1, 1, 2, "#3f8a45");
          R(ctx, fx - 1, fy, 3, 1, c);
          R(ctx, fx, fy - 1, 1, 3, c);
          R(ctx, fx, fy, 1, 1, "#f5c542");
        }
      } else if (t === "sand") {
        R(ctx, X, Y, TILE, TILE, "#e8d194");
        for (let i = 0; i < 7; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, "#d8bd7c");
        for (let i = 0; i < 4; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, "#f4e3ae");
        if (rnd() < 0.05) {
          R(ctx, X + 5, Y + 7, 2, 1, "#fff");
          R(ctx, X + 6, Y + 8, 1, 1, "#f1b6c8");
        }
      } else if (t === "dirt") {
        R(ctx, X, Y, TILE, TILE, "#b48a5c");
        for (let i = 0; i < 9; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, "#9b7248");
        for (let i = 0; i < 6; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, "#c9a274");
        if (rnd() < 0.35) {
          const qx = X + 2 + Math.floor(rnd() * 11);
          const qy = Y + 2 + Math.floor(rnd() * 11);
          R(ctx, qx, qy, 2, 1, "#d8c7a6");
          R(ctx, qx, qy + 1, 2, 1, "#8c6a43");
        }
        const isDirt = (ax, ay) => ax >= 0 && ay >= 0 && ax < w && ay < h && tiles[ay][ax] === "dirt";
        if (!isDirt(tx, ty - 1)) {
          R(ctx, X, Y, TILE, 1, "#cfa876");
          R(ctx, X, Y + 1, TILE, 1, "#a07a4d");
        }
        if (!isDirt(tx, ty + 1)) {
          R(ctx, X, Y + TILE - 2, TILE, 1, "#8f6c44");
          R(ctx, X, Y + TILE - 1, TILE, 1, "#7c5b36");
        }
        if (!isDirt(tx - 1, ty)) R(ctx, X, Y, 1, TILE, "#a07a4d");
        if (!isDirt(tx + 1, ty)) R(ctx, X + TILE - 1, Y, 1, TILE, "#8f6c44");
      } else {
        const d = Math.min(5, Math.max(0, dl[ty][tx] - 1));
        R(ctx, X, Y, TILE, TILE, WATER_COLORS[d]);
        if (pond[ty][tx]) {
          R(ctx, X, Y, TILE, TILE, "#5fc9d6");
          if (rnd() < 0.14) {
            const lx = X + 3 + Math.floor(rnd() * 8);
            const ly = Y + 4 + Math.floor(rnd() * 7);
            R(ctx, lx, ly, 4, 3, "#3f9d55");
            R(ctx, lx + 1, ly - 1, 2, 1, "#3f9d55");
            R(ctx, lx + 3, ly + 1, 1, 1, "#5fc9d6");
            if (rnd() < 0.5) R(ctx, lx + 1, ly, 1, 1, "#ffb7d5");
          }
        }
        const f = "rgba(240,252,255,0.85)";
        if (isLand(tx, ty - 1)) {
          for (let i = 0; i < TILE; i += 1) if ((i + tx) % 5 !== 0) R(ctx, X + i, Y, 1, i % 3 === 0 ? 2 : 1, f);
        }
        if (isLand(tx, ty + 1)) {
          for (let i = 0; i < TILE; i += 1) if ((i + tx) % 4 !== 0) R(ctx, X + i, Y + TILE - 1, 1, 1, f);
        }
        if (isLand(tx - 1, ty)) {
          for (let i = 0; i < TILE; i += 1) if ((i + ty) % 5 !== 0) R(ctx, X, Y + i, i % 3 === 0 ? 2 : 1, 1, f);
        }
        if (isLand(tx + 1, ty)) {
          for (let i = 0; i < TILE; i += 1) if ((i + ty) % 4 !== 0) R(ctx, X + TILE - 1, Y + i, 1, 1, f);
        }
      }
    }
  }
  const isPier = (x, y) => pier.some((p) => p[0] === x && p[1] === y);
  for (const [tx, ty] of pier) {
    const X = tx * TILE;
    const Y = ty * TILE;
    R(ctx, X, Y, TILE, TILE, "#b07a43");
    for (const lx of [3, 7, 11, 15]) R(ctx, X + lx, Y, 1, TILE, "#86592c");
    for (const lx of [0, 4, 8, 12]) R(ctx, X + lx, Y, 1, TILE, "#c68f55");
    if (!isPier(tx, ty - 1)) {
      R(ctx, X, Y, TILE, 2, "#6b4423");
      R(ctx, X, Y + 2, TILE, 1, "#8c5d30");
    }
    if (!isPier(tx, ty + 1)) {
      R(ctx, X, Y + TILE - 2, TILE, 2, "#6b4423");
      R(ctx, X + 1, Y + TILE - 3, 2, 1, "#e0b36e");
    }
    if (!isPier(tx, ty - 1) && tx % 2 === 0) R(ctx, X + 1, Y - 1, 3, 4, "#4f321a");
    if (!isPier(tx, ty + 1) && tx % 2 === 0) R(ctx, X + 1, Y + TILE - 3, 3, 4, "#4f321a");
  }
  for (const [tx, ty] of pier) {
    if (!isPier(tx, ty + 1) && ty + 1 < h) R(ctx, tx * TILE, (ty + 1) * TILE + 1, TILE, 4, "rgba(0,30,60,0.22)");
  }
}

// components/fishing/leviathan.ts
var LEV_PERIOD = 20 * 60 * 1e3;
var LEV_DURATION = 8 * 60 * 1e3;
function levEventAt(nowMs) {
  const w = Math.floor(nowMs / LEV_PERIOD);
  const start = w * LEV_PERIOD;
  const end = start + LEV_DURATION;
  if (nowMs >= start && nowMs < end) {
    return { w, start, end };
  }
  return null;
}
function buildLevPath(world2) {
  const pts = [];
  const h = world2?.tiles?.length ?? 0;
  const w = world2?.tiles?.[0]?.length ?? 0;
  for (let ty = 1; ty < h - 1; ty++) {
    for (let tx = 1; tx < w - 1; tx++) {
      const tile = world2.tiles[ty]?.[tx];
      if (tile === "deep" || tile === "shallow") {
        pts.push({
          x: (tx + 0.5) * TILE,
          y: (ty + 0.5) * TILE
        });
      }
    }
  }
  if (pts.length === 0) {
    pts.push({ x: 300, y: 300 }, { x: 400, y: 300 }, { x: 400, y: 400 }, { x: 300, y: 400 });
  }
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  pts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  pts.push({ ...pts[0] });
  const cum = [0];
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    cum.push(len);
  }
  return { pts, len: Math.max(len, 1), cum };
}
function levPose(path2, ev2, nowMs) {
  const elapsed = Math.max(0, nowMs - ev2.start);
  const speedPxPerMs = 0.08;
  const dist = elapsed * speedPxPerMs % path2.len;
  let idx = 0;
  while (idx < path2.cum.length - 2 && path2.cum[idx + 1] < dist) {
    idx++;
  }
  const segStart = path2.cum[idx];
  const segEnd = path2.cum[idx + 1] ?? segStart + 1;
  const frac = segEnd > segStart ? (dist - segStart) / (segEnd - segStart) : 0;
  const pA = path2.pts[idx];
  const pB = path2.pts[idx + 1] ?? pA;
  const x = pA.x + (pB.x - pA.x) * frac;
  const y = pA.y + (pB.y - pA.y) * frac;
  const angle = Math.atan2(pB.y - pA.y, pB.x - pA.x);
  return { x, y, angle, t: elapsed / 1e3 };
}
function levAlpha(ev2, nowMs) {
  const fadeMs = 1e4;
  if (nowMs <= ev2.start || nowMs >= ev2.end) return 0;
  const inAlpha = Math.min(1, (nowMs - ev2.start) / fadeMs);
  const outAlpha = Math.min(1, (ev2.end - nowMs) / fadeMs);
  return Math.max(0, Math.min(1, Math.min(inAlpha, outAlpha)));
}
function levHit(pose, px, py, radius = 48) {
  return Math.hypot(px - pose.x, py - pose.y) <= radius;
}

// lev-test.ts
var out = [];
var ok = (n2, c, extra = "") => out.push((c ? "OK    " : "GAGAL ") + n2 + (extra ? " " + extra : ""));
var world = generateWorld();
var path = buildLevPath(world);
ok("jalur berenang terbentuk", !!path, path ? `(${path.pts?.length ?? 0} titik, panjang ${Math.round(path.len ?? 0)}px)` : "");
var t0 = 18e11;
var ev = levEventAt(t0);
var guard = 0;
while (!ev && guard++ < 5e3) {
  t0 += 3e4;
  ev = levEventAt(t0);
}
ok("jadwal event ditemukan", !!ev);
var active = 0;
var n = 0;
for (let t = 18e11; t < 18e11 + 864e5; t += 1e4) {
  n++;
  if (levEventAt(t)) active++;
}
ok(
  "event aktif ~40% waktu (8 dari 20 menit)",
  Math.abs(active / n - LEV_DURATION / LEV_PERIOD) < 0.03,
  `(${(100 * active / n).toFixed(1)}%)`
);
var overlap = false;
for (let w = 1e5; w < 100200; w++) {
  const a = levEventAt(w * LEV_PERIOD + LEV_PERIOD / 2);
  const b = levEventAt((w + 1) * LEV_PERIOD + 1e3);
  if (a && b && a.w === b.w) overlap = true;
}
ok("jadwal konsisten (tanpa tumpang tindih)", !overlap);
if (path && ev) {
  let inWater = 0, tot = 0;
  for (let k = 0; k < 120; k++) {
    const p = levPose(path, ev, ev.start + k * 4e3);
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    const tile = world.tiles?.[ty]?.[tx];
    tot++;
    if (tile === "deep" || tile === "shallow") inWater++;
  }
  ok("kepala Leviathan selalu berenang di air", inWater === tot, `(${inWater}/${tot})`);
  const p0 = levPose(path, ev, ev.start + 1e4);
  ok("levHit: kena di tengah badan", levHit(p0, p0.x, p0.y));
  ok("levHit: tidak kena jauh dari badan", !levHit(p0, p0.x + 300, p0.y + 200));
  ok(
    "alpha memudar di awal & akhir",
    levAlpha(ev, ev.start) === 0 && levAlpha(ev, ev.start + 3e4) === 1 && levAlpha(ev, ev.end - 1) < 0.01
  );
  out.push("pose=" + JSON.stringify(p0));
}
console.log(out.join("\n"));
