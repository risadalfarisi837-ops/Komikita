// Semua gambar game Mancing dibuat lewat kode (pixel art procedural), tanpa file gambar.
import { RARITY, isXL, sizeRatio } from '@/lib/fishing';
import type { Species } from '@/lib/fishing';
import { FISH_ART } from './fishArt';
import type { FishArt } from './fishArt';

export const TILE = 16;
export type Dir = 'down' | 'up' | 'left' | 'right';
export type Tile = 'deep' | 'shallow' | 'sand' | 'grass' | 'plank' | 'dirt';
export type PropKind = 'palm' | 'rock' | 'lamp' | 'fountain' | 'bench' | 'table' | 'stool' | 'sign' | 'bush' | 'npc' | 'shop' | 'stall' | 'flowers' | 'barrel' | 'crate' | 'net' | 'umbrella' | 'boat' | 'giantfish' | 'pine' | 'lighthouse' | 'bigtree';
export interface Prop { kind: PropKind; x: number; y: number; v: number; w?: number; h?: number; name?: string; role?: string }
export interface World {
  w: number;
  h: number;
  tiles: Tile[][];
  blocked: boolean[][];
  props: Prop[];
  start: { x: number; y: number };
  terrain: HTMLCanvasElement;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- util warna ----------
function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t);
  return 'rgb(' + f(r1, r2) + ',' + f(g1, g2) + ',' + f(b1, b2) + ')';
}
const lighten = (c: string, t: number) => mix(c, '#ffffff', t);
const darken = (c: string, t: number) => mix(c, '#000000', t);

function mk(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
function R(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  ctx.fillStyle = col;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}


// ---------- cache gambar (bake) + garis tepi ----------
// Properti statis (semak, meja, bangku, tong, papan, kios, dll) dulu digambar ulang piksel demi piksel tiap frame
// (ell = 1 fillRect per piksel, ribuan per frame). Sekarang digambar SEKALI ke kanvas kecil, diberi garis tepi gelap
// seperti game aslinya, lalu tiap frame cuma ditempel pakai drawImage.
export const ART_FX = { bake: true, outline: true };
interface Baked { c: HTMLCanvasElement; ox: number; oy: number }
const BAKE_CACHE = new Map<string, Baked>();
const OUTLINE_K: [number, number, number] = [0.4, 0.37, 0.46];

// Gambar garis tepi 1 piksel di sekeliling piksel padat (alpha >= 200); warnanya versi gelap dari piksel tetangganya.
function outlineMask(c: HTMLCanvasElement): HTMLCanvasElement {
  const o = mk(c.width, c.height);
  const src = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const w = c.width, h = c.height;
  const d = src.getImageData(0, 0, w, h).data;
  const oc = o.getContext('2d') as CanvasRenderingContext2D;
  const out = oc.createImageData(w, h);
  const od = out.data;
  const nb = [-1, 0, 1, 0, 0, -1, 0, 1];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] >= 200) continue;
      for (let k = 0; k < 8; k += 2) {
        const nx = x + nb[k], ny = y + nb[k + 1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4;
        if (d[j + 3] >= 200) {
          od[i] = d[j] * OUTLINE_K[0]; od[i + 1] = d[j + 1] * OUTLINE_K[1]; od[i + 2] = d[j + 2] * OUTLINE_K[2]; od[i + 3] = 255;
          break;
        }
      }
    }
  }
  oc.putImageData(out, 0, 0);
  return o;
}

// geo = [lebar, tinggi, ox, oy]: titik asal properti (p.x*TILE, p.y*TILE) ada di (ox, oy) dalam kanvas; ox & oy kelipatan TILE.
type Geo = [number, number, number, number];
function bakeLayers(key: string, geo: Geo, p: Prop, fns: ((cx: CanvasRenderingContext2D, q: Prop) => void)[], outline: boolean): Baked[] {
  const hit = BAKE_CACHE.get(key);
  if (hit) return [hit, BAKE_CACHE.get(key + '#1') as Baked].filter(Boolean) as Baked[];
  const [w, h, ox, oy] = geo;
  const q: Prop = { ...p, x: ox / TILE, y: oy / TILE };
  const layers = fns.map((fn) => { const c = mk(w, h); const cx = c.getContext('2d') as CanvasRenderingContext2D; cx.imageSmoothingEnabled = false; fn(cx, q); return c; });
  if (outline && ART_FX.outline) {
    const comp = mk(w, h);
    const cc = comp.getContext('2d') as CanvasRenderingContext2D;
    for (const l of layers) cc.drawImage(l, 0, 0);
    const mask = outlineMask(comp);
    const first = layers[0].getContext('2d') as CanvasRenderingContext2D;
    const keep = mk(w, h);
    const kc = keep.getContext('2d') as CanvasRenderingContext2D;
    kc.drawImage(layers[0], 0, 0);
    first.clearRect(0, 0, w, h);
    first.drawImage(mask, 0, 0); // garis tepi di bawah
    first.drawImage(keep, 0, 0);
  }
  const res = layers.map((c) => ({ c, ox, oy }));
  BAKE_CACHE.set(key, res[0]);
  if (res[1]) BAKE_CACHE.set(key + '#1', res[1]);
  return res;
}
function blit(ctx: CanvasRenderingContext2D, p: Prop, b: Baked) {
  ctx.drawImage(b.c, Math.round(p.x * TILE) - b.ox, Math.round(p.y * TILE) - b.oy);
}
// properti satu lapis (statis penuh)
function drawBaked(ctx: CanvasRenderingContext2D, p: Prop, key: string, geo: Geo, raw: (cx: CanvasRenderingContext2D, q: Prop) => void, outline = true) {
  if (!ART_FX.bake) { raw(ctx, p); return; }
  blit(ctx, p, bakeLayers(key, geo, p, [raw], outline)[0]);
}

// ---------- dunia ----------
export const MAP_W = 36;
export const MAP_H = 40; // lebih tinggi: ada dek pamer dan ikan raksasa di selatan pulau
const WATER_COLORS = ['#6fd0ea', '#5cc2e4', '#4cb1dc', '#3c9fd3', '#2f88c5', '#2872b4'];

export function generateWorldOld(seed = 11): World {
  const rnd = mulberry32(seed);
  const W = MAP_W;
  const H = MAP_H;
  const land: boolean[][] = [];
  const pond: boolean[][] = [];
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
      const py = (y - 16) / 2.4;
      pond[y][x] = px * px + py * py < 1;
      if (pond[y][x]) land[y][x] = false;
    }
  }

  // jarak ke daratan (untuk warna air) & jarak ke air (untuk pasir)
  const INF = 99;
  const dl: number[][] = [];
  const dw: number[][] = [];
  for (let y = 0; y < H; y++) { dl[y] = Array(W).fill(INF); dw[y] = Array(W).fill(INF); }
  const bfs = (dist: number[][], src: (x: number, y: number) => boolean) => {
    const q: [number, number][] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (src(x, y)) { dist[y][x] = 0; q.push([x, y]); }
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ax;
        const ny = y + ay;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (dist[ny][nx] > dist[y][x] + 1) { dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); }
      }
    }
  };
  bfs(dl, (x, y) => land[y][x]);
  bfs(dw, (x, y) => !land[y][x]);

  // noise halus untuk bercak rumput
  const hash = (x: number, y: number) => { const n = Math.sin(x * 127.1 + y * 311.7 + seed * 17.3) * 43758.5453; return n - Math.floor(n); };
  const vnoise = (x: number, y: number) => {
    const xi = Math.floor(x); const yi = Math.floor(y);
    const xf = x - xi; const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf); const v = yf * yf * (3 - 2 * yf);
    const n00 = hash(xi, yi); const n10 = hash(xi + 1, yi); const n01 = hash(xi, yi + 1); const n11 = hash(xi + 1, yi + 1);
    return n00 + (n10 - n00) * u + (n01 - n00) * v + (n00 - n10 - n01 + n11) * u * v;
  };

  const tiles: Tile[][] = [];
  for (let y = 0; y < H; y++) {
    tiles[y] = [];
    for (let x = 0; x < W; x++) {
      if (land[y][x]) {
        const n = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        const frac = n < 0 ? n + 1 : n;
        const beach = dw[y][x] <= 1 || (dw[y][x] === 2 && frac < 0.45);
        tiles[y][x] = beach ? 'sand' : (dw[y][x] >= 3 && vnoise(x / 4.2, y / 4.2) > 0.22 ? 'grass' : 'sand');
      } else {
        tiles[y][x] = dl[y][x] <= 2 ? 'shallow' : 'deep';
      }
    }
  }

  // titik mulai: dekat pantai timur, di jalur tanah
  const sy = 13;
  let shoreX = Math.round(cx);
  while (shoreX < W - 1 && land[sy][shoreX]) shoreX++;
  const start = { x: shoreX - 5, y: sy };

  // jalur tanah berkelok dari barat ke pantai
  const pathPts: [number, number][] = [
    [2.5, sy - 6], [start.x - 17, sy - 3], [start.x - 12, sy + 1.5], [start.x - 7, sy - 0.5],
    [start.x - 3, sy + 2], [start.x + 1, sy], [shoreX - 2.4, sy + 1.2],
  ];
  for (let i = 0; i + 1 < pathPts.length; i++) {
    const [x0, y0] = pathPts[i];
    const [x1, y1] = pathPts[i + 1];
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4);
    for (let k = 0; k <= steps; k++) {
      const f = k / steps;
      const wob = Math.sin((i * 7 + f * 5)) * 0.35;
      const px = x0 + (x1 - x0) * f;
      const py = y0 + (y1 - y0) * f + wob;
      const rad = 1.05 + 0.3 * Math.sin(f * 6 + i);
      for (let ty = Math.floor(py - 2); ty <= Math.ceil(py + 2); ty++) {
        for (let tx = Math.floor(px - 2); tx <= Math.ceil(px + 2); tx++) {
          if (tx < 2 || ty < 2 || tx >= W || ty >= H || !land[ty][tx] || dw[ty][tx] < 2) continue;
          if ((tx + 0.5 - px) ** 2 + (ty + 0.5 - py) ** 2 < rad * rad) tiles[ty][tx] = 'dirt';
        }
      }
    }
  }

  // dermaga (2 petak lebar) menjorok ke laut
  const py = sy + 3;
  let pierX = Math.round(cx);
  while (pierX < W - 1 && land[py][pierX]) pierX++;
  const pierTiles: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    for (const yy of [py, py + 1]) {
      const xx = pierX + i;
      if (xx < W && !land[yy][xx]) { tiles[yy][xx] = 'plank'; pierTiles.push([xx, yy]); }
    }
  }
  const near = (x: number, y: number, ax: number, ay: number, r: number) => Math.abs(x - ax) + Math.abs(y - ay) <= r;

  // properti
  const props: Prop[] = [];
  const occ: boolean[][] = [];
  for (let y = 0; y < H; y++) occ[y] = Array(W).fill(false);
  const place = (kind: Prop['kind'], x: number, y: number) => {
    props.push({ kind, x, y, v: rnd() });
    occ[y][x] = true;
  };
  const walkable = (x: number, y: number) => x > 1 && y > 1 && x < W && y < H && (tiles[y][x] === 'sand' || tiles[y][x] === 'grass' || tiles[y][x] === 'dirt') && !occ[y][x];
  // letakkan properti berukuran w×h petak di salah satu posisi calon (kiri-atas); kembalikan posisi yang dipakai
  const putBlock = (kind: Prop['kind'], cands: [number, number][], w: number, h: number, extra: Partial<Prop> = {}): [number, number] | null => {
    for (const [bx, by] of cands) {
      let ok = true;
      for (let yy = by; yy < by + h && ok; yy++) {
        for (let xx = bx; xx < bx + w; xx++) {
          if (!walkable(xx, yy) || near(xx, yy, start.x, start.y, 1)) { ok = false; break; }
        }
      }
      if (!ok) continue;
      props.push({ kind, x: bx, y: by, v: rnd(), w, h, ...extra });
      for (let yy = by; yy < by + h; yy++) for (let xx = bx; xx < bx + w; xx++) occ[yy][xx] = true;
      return [bx, by];
    }
    return null;
  };
  const sx = start.x;
  const fountainAt = putBlock('fountain', [[sx - 1, sy - 9], [sx - 3, sy - 9], [sx + 1, sy - 8], [sx - 5, sy - 9], [sx - 2, sy - 10], [sx - 7, sy - 9]], 4, 3);
  // plaza batu bundar di sekeliling air mancur (tile 'dirt' yang digambar sebagai paving)
  const plaza = new Set<string>();
  if (fountainAt) {
    const pcx = fountainAt[0] + 2;
    const pcy = fountainAt[1] + 1.5;
    for (let yy = 2; yy < H; yy++) {
      for (let xx = 2; xx < W; xx++) {
        const ex = (xx + 0.5 - pcx) / 5.4;
        const ey = (yy + 0.5 - pcy) / 4.3;
        if (ex * ex + ey * ey >= 1 || !land[yy][xx] || dw[yy][xx] < 2) continue;
        const tt = tiles[yy][xx];
        if (tt === 'sand' || tt === 'grass' || tt === 'dirt') { tiles[yy][xx] = 'dirt'; plaza.add(xx + ',' + yy); }
      }
    }
  }
  // toko di tengah pulau (4x3 petak), dipasang dulu supaya dapat tempat terbaik
  putBlock('shop', [[13, 10], [12, 10], [14, 10], [13, 9], [12, 9], [14, 9], [13, 11], [11, 10], [15, 10], [12, 11], [14, 11], [10, 10], [16, 10]], 4, 3, { name: 'Toko Mancing', role: 'Umpan · Joran · Jual Ikan' });
  const tbl = putBlock('table', [[sx - 8, sy - 3], [sx - 7, sy - 4], [sx - 9, sy - 3], [sx - 8, sy - 5]], 2, 1);
  if (tbl) {
    putBlock('stool', [[tbl[0] - 1, tbl[1]]], 1, 1);
    putBlock('stool', [[tbl[0] + 2, tbl[1]]], 1, 1);
  }
  putBlock('bench', [[sx - 13, sy - 5], [sx - 12, sy - 6], [sx - 14, sy - 4], [sx - 12, sy - 3]], 3, 1);
  putBlock('sign', [[sx - 5, sy + 4], [sx - 4, sy + 4], [sx - 5, sy + 3], [sx - 6, sy + 4]], 1, 1);
  putBlock('lamp', [[sx - 8, sy + 4], [sx - 9, sy + 4], [sx - 8, sy + 3]], 1, 1);
  putBlock('lamp', [[sx - 1, sy + 4], [sx, sy + 4], [sx - 1, sy + 3]], 1, 1);
  putBlock('npc', [[sx + 3, sy - 2], [sx + 3, sy - 3], [sx + 2, sy - 2], [sx + 2, sy - 3]], 1, 1, { name: 'Pak Bayu', role: 'Pemancing' });
  for (const c of [[sx + 6, sy - 3], [sx + 7, sy - 1], [sx + 5, sy - 6], [sx - 11, sy + 1], [sx - 3, sy - 7], [sx + 4, sy - 7], [sx - 15, sy - 1], [sx - 10, sy - 6]] as [number, number][]) {
    putBlock('bush', [c], 1, 1);
  }

  // ---------- warung, hiasan, dek pamer, dan ikan raksasa ----------
  const spotOk = (bx: number, by: number, w: number, h: number) => {
    for (let yy = by; yy < by + h; yy++) {
      for (let xx = bx; xx < bx + w; xx++) {
        if (xx < 3 || yy < 3 || xx >= W - 1 || yy >= H - 1 || !walkable(xx, yy) || dw[yy][xx] < 2 || near(xx, yy, start.x, start.y, 2)) return false;
      }
    }
    return true;
  };
  const stalls: Prop[] = [];
  const bestSpot = (tx: number, ty: number, w: number, h: number, minFar: number): [number, number] | null => {
    let best: [number, number] | null = null;
    let bd = 1e9;
    for (let by = 3; by < H - 3; by++) {
      for (let bx = 3; bx < W - 3; bx++) {
        if (!spotOk(bx, by, w, h)) continue;
        const cxx = bx + w / 2;
        const cyy = by + h / 2;
        let far = true;
        for (const o of [...stalls, ...props.filter((q) => q.kind === 'shop' || q.kind === 'fountain')]) {
          if (Math.hypot(cxx - (o.x + (o.w || 1) / 2), cyy - (o.y + (o.h || 1) / 2)) < minFar) { far = false; break; }
        }
        if (!far) continue;
        const d = Math.hypot(cxx - tx, cyy - ty);
        if (d < bd) { bd = d; best = [bx, by]; }
      }
    }
    return best;
  };
  const stallDefs = [
    { name: 'Warung Ikan Bakar', role: 'Makanan', t: [sx - 9, sy - 5], variant: 0 },
    { name: 'Toko Umpan', role: 'Cacing · Udang', t: [sx - 3, sy - 7], variant: 1 },
    { name: 'Toko Hiasan', role: 'Lentera · Kerang', t: [sx - 6, sy + 4], variant: 2 },
    { name: 'Kedai Kelapa', role: 'Minuman', t: [sx - 14, sy - 1], variant: 3 },
  ];
  for (const d of stallDefs) {
    const at = bestSpot(d.t[0], d.t[1], 3, 2, 6);
    if (!at) continue;
    const pr: Prop = { kind: 'stall', x: at[0], y: at[1], v: d.variant + rnd() * 0.9, w: 3, h: 2, name: d.name, role: d.role };
    props.push(pr);
    stalls.push(pr);
    for (let yy = at[1]; yy < at[1] + 2; yy++) for (let xx = at[0]; xx < at[0] + 3; xx++) occ[yy][xx] = true;
    // tong dan peti di samping warung
    if (spotOk(at[0] + 3, at[1] + 1, 1, 1)) place('barrel', at[0] + 3, at[1] + 1);
    if (spotOk(at[0] - 1, at[1] + 1, 1, 1)) place('crate', at[0] - 1, at[1] + 1);
  }
  // jaring jemuran dekat dermaga
  for (const c of [[pierX - 5, py - 3], [pierX - 5, py + 4], [pierX - 7, py - 3], [pierX - 7, py + 4]] as [number, number][]) {
    if (spotOk(c[0], c[1], 2, 1)) { putBlock('net', [c], 2, 1); break; }
  }
  // payung pantai di pasir (berjarak)
  let umb = 0;
  const umbs: [number, number][] = [];
  for (let k = 0; k < 400 && umb < 5; k++) {
    const ux = 3 + Math.floor(rnd() * (W - 8));
    const uy = 3 + Math.floor(rnd() * (H - 8));
    if (tiles[uy][ux] !== 'sand' || dw[uy][ux] < 2 || dw[uy][ux] > 3 || !spotOk(ux, uy, 1, 1)) continue;
    if (umbs.some(([a, b]) => Math.hypot(a - ux, b - uy) < 7)) continue;
    umbs.push([ux, uy]);
    place('umbrella', ux, uy);
    umb++;
  }
  // bunga di rumput (bisa dilewati)
  let fl = 0;
  for (let k = 0; k < 900 && fl < 34; k++) {
    const fx = 3 + Math.floor(rnd() * (W - 8));
    const fy = 3 + Math.floor(rnd() * (H - 8));
    if (tiles[fy][fx] !== 'grass' || occ[fy][fx] || dw[fy][fx] < 3) continue;
    props.push({ kind: 'flowers', x: fx, y: fy, v: rnd() });
    fl++;
  }
  // perahu kecil di air dangkal dekat pantai
  const boats: [number, number][] = [];
  for (let by = H - 14; by > 6 && boats.length < 2; by--) {
    for (let bx = 4; bx < W - 6 && boats.length < 2; bx++) {
      if (tiles[by][bx] === 'shallow' && tiles[by][bx + 1] === 'shallow' && tiles[by][bx + 2] === 'shallow' && dl[by][bx] <= 2 && !pierTiles.some(([a, b]) => Math.abs(a - bx) < 4 && Math.abs(b - by) < 3) && !boats.some(([a, b]) => Math.hypot(a - bx, b - by) < 9)) {
        boats.push([bx, by]);
        props.push({ kind: 'boat', x: bx, y: by, v: rnd(), w: 2, h: 1 });
      }
    }
  }
  // dek pamer di selatan pulau + ikan raksasa di bawahnya
  let deckX = Math.round(cx) - 1;
  let deckY = H - 12;
  while (deckY > 0 && !land[deckY][deckX]) deckY--;
  for (let i = 1; i <= 5; i++) {
    for (const xx of [deckX, deckX + 1]) {
      const yy = deckY + i;
      if (yy < H && !land[yy][xx]) { tiles[yy][xx] = 'plank'; pierTiles.push([xx, yy]); }
    }
  }
  const fishW = 16;
  const fishH = 6;
  props.push({ kind: 'giantfish', x: Math.max(1, Math.round(cx) - 8), y: Math.min(H - fishH - 1, deckY + 7), v: rnd(), w: fishW, h: fishH, name: 'Ikan Raksasa Pulau', role: 'Pamer di sini!' });

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = tiles[y][x];
      if (t !== 'grass' && t !== 'sand') continue;
      if (near(x, y, start.x, start.y, 3) || near(x, y, pierX - 1, py, 3) || near(x, y, pierX - 1, py + 1, 3)) continue;
      if (x === 0 || y === 0 || occ[y][x]) continue; // tepi peta: dibatasi lewat blocked, pohon ada di baris/kolom ke-1
      const neighOcc = occ[y][x - 1] || occ[y - 1][x] || (x + 1 < W && occ[y - 1][x + 1]) || occ[y - 1][x - 1];
      if (x === 1 || y === 1) { if (rnd() < 0.85) place('palm', x, y); continue; }
      if (t === 'grass') {
        const pp = dw[y][x] >= 3 ? 0.085 : 0.1;
        if (!neighOcc && rnd() < pp) { place('palm', x, y); if (rnd() < 0.8) props[props.length - 1].role = 'fruit'; }
      } else if (dw[y][x] >= 3 && rnd() < 0.035 && !neighOcc) {
        place('palm', x, y);
      } else if (rnd() < 0.03 && !neighOcc) {
        place('rock', x, y);
      }
    }
  }
  // lampu di dekat dermaga
  const lampSpots: [number, number][] = [[pierX - 1, py - 1], [pierX - 1, py + 2]];
  for (const [lx, ly] of lampSpots) {
    if (ly > 0 && ly < H && (tiles[ly][lx] === 'sand' || tiles[ly][lx] === 'grass') && !occ[ly][lx]) place('lamp', lx, ly);
  }

  const blocked: boolean[][] = [];
  for (let y = 0; y < H; y++) {
    blocked[y] = [];
    for (let x = 0; x < W; x++) {
      const t = tiles[y][x];
      blocked[y][x] = (t === 'deep' || t === 'shallow') || occ[y][x] || x === 0 || y === 0;
    }
  }

  const world: World = { w: W, h: H, tiles, blocked, props, start, terrain: mk(W * TILE, H * TILE) };
  renderTerrain(world, dl, pond, pierTiles, seed, plaza);
  return world;
}


// ---------- pulau besar (mengikuti peta di game referensi) ----------
export const WORLD_W = 100;
export const WORLD_H = 58;
// koordinat gambar ringkasan referensi (gx, gy) -> petak
const G = (gx: number, gy: number): [number, number] => [gx / 17.4 + 4.67, gy / 17.4 + 5.5];
const ISLAND_G: [number, number][] = [
  [395, 115], [440, 78], [520, 62], [620, 68], [720, 82], [810, 80], [900, 92], [980, 112], [1060, 135], [1120, 170], [1190, 215],
  [1270, 262], [1340, 300], [1420, 322], [1472, 380], [1440, 425], [1370, 428], [1310, 442], [1250, 475], [1200, 525], [1150, 575],
  [1100, 640], [1060, 690], [980, 712], [900, 708], [820, 702], [700, 702], [600, 692], [520, 655], [440, 640], [350, 640], [290, 612],
  [200, 592], [130, 562], [80, 535], [52, 470], [55, 420], [90, 380], [160, 345], [240, 325], [320, 275], [375, 225], [385, 165],
];
function inPoly(x: number, y: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function generateWorld(seed = 11): World {
  const rnd = mulberry32(seed);
  const W = WORLD_W;
  const H = WORLD_H;
  const poly = ISLAND_G.map(([a, b]) => G(a, b));
  const lakeC = G(470, 470);
  const lakeRx = 105 / 17.4;
  const lakeRy = 52 / 17.4;
  const pondC = G(500, 190);
  const bayC = G(750, 690);
  const streamPts = [G(395, 500), G(355, 550), G(325, 585), G(300, 625)];
  const ell2 = (x: number, y: number, c: [number, number], rx: number, ry: number) => ((x - c[0]) / rx) ** 2 + ((y - c[1]) / ry) ** 2 < 1;

  const land: boolean[][] = [];
  const pond: boolean[][] = [];
  const bay: boolean[][] = [];
  for (let y = 0; y < H; y++) {
    land[y] = [];
    pond[y] = [];
    bay[y] = [];
    for (let x = 0; x < W; x++) {
      const hx = (vnoise(x / 4.5, y / 4.5, seed) - 0.5) * 1.6;
      const hy = (vnoise(x / 4.5 + 50, y / 4.5 + 50, seed) - 0.5) * 1.6;
      const inside = inPoly(x + 0.5 + hx, y + 0.5 + hy, poly);
      const cx0 = x + 0.5;
      const cy0 = y + 0.5;
      let isPond = ell2(cx0, cy0, lakeC, lakeRx, lakeRy) || ell2(cx0, cy0, pondC, 2.2, 1.3);
      for (let i = 0; i + 1 < streamPts.length && !isPond; i++) {
        if (segDist(cx0, cy0, streamPts[i][0], streamPts[i][1], streamPts[i + 1][0], streamPts[i + 1][1]) < 0.62) isPond = true;
      }
      pond[y][x] = isPond && inside;
      bay[y][x] = ell2(cx0, cy0, bayC, 3.4, 2.3);
      land[y][x] = inside && !pond[y][x] && !bay[y][x];
    }
  }

  // jarak ke daratan (warna air), ke air apa pun (pasir/jarak aman), dan ke LAUT saja (pantai; tepi danau tetap rumput)
  const INF = 99;
  const dl: number[][] = [];
  const dw: number[][] = [];
  const ds: number[][] = [];
  for (let y = 0; y < H; y++) { dl[y] = Array(W).fill(INF); dw[y] = Array(W).fill(INF); ds[y] = Array(W).fill(INF); }
  const bfs = (dist: number[][], src: (x: number, y: number) => boolean) => {
    const q: [number, number][] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (src(x, y)) { dist[y][x] = 0; q.push([x, y]); }
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ax;
        const ny = y + ay;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (dist[ny][nx] > dist[y][x] + 1) { dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); }
      }
    }
  };
  bfs(dl, (x, y) => land[y][x]);
  bfs(dw, (x, y) => !land[y][x]);
  bfs(ds, (x, y) => !land[y][x] && !pond[y][x]);

  const sandZone = (x: number, y: number) => {
    const gx = (x - 4.67) * 17.4;
    const gy = (y - 5.5) * 17.4;
    return gx > 1230 || (gy < 135 && gx < 720) || (gy < 165 && gx > 1000 && gx < 1230);
  };
  const tiles: Tile[][] = [];
  for (let y = 0; y < H; y++) {
    tiles[y] = [];
    for (let x = 0; x < W; x++) {
      if (land[y][x]) {
        const n = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        const frac = n < 0 ? n + 1 : n;
        const beach = ds[y][x] <= 1 || (ds[y][x] === 2 && frac < 0.45);
        const grassy = !beach && !sandZone(x, y) && (ds[y][x] >= 4 || vnoise(x / 4.2, y / 4.2, seed) > 0.25);
        tiles[y][x] = grassy ? 'grass' : 'sand';
      } else {
        tiles[y][x] = dl[y][x] <= 2 ? 'shallow' : 'deep';
      }
    }
  }

  // titik mulai: di plaza, selatan air mancur
  const start = { x: 47, y: 33 };

  // jalan tanah yang menyebar dari plaza (kemerahan, berkelok)
  const roads: [number, number][][] = [
    // jalan lingkar mengelilingi plaza dan danau
    Array.from({ length: 29 }, (_, k) => {
      const a = (k / 28) * Math.PI * 2 + 0.25;
      return [745 + Math.cos(a) * 250, 425 + Math.sin(a) * 175] as [number, number];
    }),
    [[690, 420], [600, 380], [500, 365], [400, 385], [330, 430], [300, 490], [335, 548]],
    [[760, 380], [770, 300], [765, 200], [772, 112]],
    [[740, 330], [660, 300], [570, 290]],
    [[830, 400], [930, 330], [1030, 320], [1150, 330], [1260, 370], [1370, 415]],
    [[760, 480], [770, 560], [752, 645]],
    [[820, 470], [940, 520], [1030, 590], [1075, 650]],
    [[700, 470], [620, 540], [540, 600], [480, 632]],
  ];
  roads.forEach((r, ri) => {
    const pathPts = r.map(([a, b]) => G(a, b));
    for (let i = 0; i + 1 < pathPts.length; i++) {
      const [x0, y0] = pathPts[i];
      const [x1, y1] = pathPts[i + 1];
      const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4);
      for (let k = 0; k <= steps; k++) {
        const f = k / steps;
        const wob = Math.sin(ri * 5 + i * 7 + f * 5) * 0.3;
        const px = x0 + (x1 - x0) * f;
        const py = y0 + (y1 - y0) * f + wob;
        const rad = 0.8 + 0.22 * Math.sin(f * 6 + i + ri);
        for (let ty = Math.floor(py - 2); ty <= Math.ceil(py + 2); ty++) {
          for (let tx = Math.floor(px - 2); tx <= Math.ceil(px + 2); tx++) {
            if (tx < 2 || ty < 2 || tx >= W || ty >= H || !land[ty][tx] || dw[ty][tx] < 2) continue;
            if ((tx + 0.5 - px) ** 2 + (ty + 0.5 - py) ** 2 < rad * rad) tiles[ty][tx] = 'dirt';
          }
        }
      }
    }
  });

  // dermaga: ke arah (dx,dy) dari titik di darat sampai air, lalu 6 papan (lebar 2 petak)
  const pierTiles: [number, number][] = [];
  const mkPier = (sx0: number, sy0: number, dx: number, dy: number, len = 6): [number, number] => {
    let x = sx0;
    let y = sy0;
    while (x > 1 && y > 1 && x < W - 2 && y < H - 2 && land[y][x]) { x += dx; y += dy; }
    for (let i = 0; i < len; i++) {
      for (const w of [0, 1]) {
        const xx = x + dx * i + (dy !== 0 ? w : 0);
        const yy = y + dy * i + (dx !== 0 ? w : 0);
        if (xx > 0 && yy > 0 && xx < W && yy < H && !land[yy][xx]) { tiles[yy][xx] = 'plank'; pierTiles.push([xx, yy]); }
      }
    }
    return [x, y];
  };
  const south = mkPier(47, 40, 0, 1, 8);
  const eastP = mkPier(80, 30, 1, 0, 6);
  // jembatan kayu di atas sungai kecil (barat daya danau)
  const brC = G(355, 552);
  for (let y = 2; y < H; y++) {
    for (let x = 2; x < W; x++) {
      if (pond[y][x] && Math.hypot(x + 0.5 - brC[0], y + 0.5 - brC[1]) < 1.9) { tiles[y][x] = 'plank'; pierTiles.push([x, y]); }
    }
  }
  const near = (x: number, y: number, ax: number, ay: number, r: number) => Math.abs(x - ax) + Math.abs(y - ay) <= r;

  // properti
  const props: Prop[] = [];
  const occ: boolean[][] = [];
  for (let y = 0; y < H; y++) occ[y] = Array(W).fill(false);
  const place = (kind: Prop['kind'], x: number, y: number) => {
    props.push({ kind, x, y, v: rnd() });
    occ[y][x] = true;
  };
  const walkable = (x: number, y: number) => x > 1 && y > 1 && x < W - 1 && y < H - 1 && (tiles[y][x] === 'sand' || tiles[y][x] === 'grass' || tiles[y][x] === 'dirt') && !occ[y][x];
  const putBlock = (kind: Prop['kind'], cands: [number, number][], w: number, h: number, extra: Partial<Prop> = {}): [number, number] | null => {
    for (const [bx, by] of cands) {
      let ok = true;
      for (let yy = by; yy < by + h && ok; yy++) {
        for (let xx = bx; xx < bx + w; xx++) {
          if (!walkable(xx, yy) || near(xx, yy, start.x, start.y, 1)) { ok = false; break; }
        }
      }
      if (!ok) continue;
      props.push({ kind, x: bx, y: by, v: rnd(), w, h, ...extra });
      for (let yy = by; yy < by + h; yy++) for (let xx = bx; xx < bx + w; xx++) occ[yy][xx] = true;
      return [bx, by];
    }
    return null;
  };

  // air mancur + plaza batu bundar
  const fountainAt = putBlock('fountain', [[46, 28], [45, 28], [47, 28], [46, 27], [46, 29]], 4, 3);
  const plaza = new Set<string>();
  const pcx = (fountainAt ? fountainAt[0] : 46) + 2;
  const pcy = (fountainAt ? fountainAt[1] : 28) + 1.5;
  for (let yy = 2; yy < H; yy++) {
    for (let xx = 2; xx < W; xx++) {
      const ex = (xx + 0.5 - pcx) / 5.9;
      const ey = (yy + 0.5 - pcy) / 5.0;
      if (ex * ex + ey * ey >= 1 || !land[yy][xx] || dw[yy][xx] < 2) continue;
      const tt = tiles[yy][xx];
      if (tt === 'sand' || tt === 'grass' || tt === 'dirt') { tiles[yy][xx] = 'dirt'; plaza.add(xx + ',' + yy); }
    }
  }
  putBlock('npc', [[pcx - 0.5, pcy - 3] as [number, number], [47, 26], [48, 26], [46, 26]].map(([a, b]) => [Math.round(a), Math.round(b)] as [number, number]), 1, 1, { name: 'Marina', role: 'Pemandu Pulau' });
  // papan penunjuk arah mengelilingi plaza
  for (const c of [[41, 29], [54, 29], [44, 24], [51, 35]] as [number, number][]) putBlock('sign', [c, [c[0] + 1, c[1]], [c[0], c[1] + 1]], 1, 1);
  // lampu mengelilingi plaza
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.3;
    const lx = Math.round(pcx + Math.cos(a) * 6.4);
    const ly = Math.round(pcy + Math.sin(a) * 5.4);
    putBlock('lamp', [[lx, ly], [lx + 1, ly], [lx, ly + 1]], 1, 1);
  }
  putBlock('bench', [[42, 25], [43, 25], [42, 26]], 3, 1);
  putBlock('bench', [[51, 33], [52, 33], [51, 34]], 3, 1);
  // toko utama (pembeli ikan) di timur laut plaza
  putBlock('shop', [[55, 22], [56, 22], [54, 22], [55, 21], [57, 21], [53, 21], [56, 23], [58, 22]], 4, 3, { name: 'Toko Mancing', role: 'Umpan · Joran · Jual Ikan' });
  putBlock('npc', [[86, 32], [86, 31], [85, 32], [85, 31], [87, 32]], 1, 1, { name: 'Pak Bayu', role: 'Pemancing' });
  // mercusuar di tanjung timur + pohon raksasa di barat
  putBlock('lighthouse', [[84, 27], [84, 28], [83, 28], [85, 28], [83, 27]], 2, 2);
  putBlock('bigtree', [[13, 28], [14, 28], [13, 29], [12, 28], [14, 29]], 4, 3);
  // perkemahan di hutan
  const camp = putBlock('table', [[36, 21], [37, 21], [36, 22]], 2, 1);
  if (camp) {
    putBlock('stool', [[camp[0] - 1, camp[1]]], 1, 1);
    putBlock('stool', [[camp[0] + 2, camp[1]]], 1, 1);
    putBlock('barrel', [[camp[0] + 3, camp[1] + 1], [camp[0] + 3, camp[1]]], 1, 1);
    putBlock('crate', [[camp[0] - 2, camp[1] + 1], [camp[0] - 2, camp[1]]], 1, 1);
  }

  // ---------- warung ----------
  const spotOk = (bx: number, by: number, w: number, h: number) => {
    for (let yy = by; yy < by + h; yy++) {
      for (let xx = bx; xx < bx + w; xx++) {
        if (xx < 3 || yy < 3 || xx >= W - 1 || yy >= H - 1 || !walkable(xx, yy) || dw[yy][xx] < 2 || near(xx, yy, start.x, start.y, 2)) return false;
      }
    }
    return true;
  };
  const stalls: Prop[] = [];
  const bestSpot = (tx: number, ty: number, w: number, h: number, minFar: number): [number, number] | null => {
    let best: [number, number] | null = null;
    let bd = 1e9;
    const y0 = Math.max(3, Math.floor(ty - 14));
    const y1 = Math.min(H - 3, Math.ceil(ty + 14));
    const x0 = Math.max(3, Math.floor(tx - 14));
    const x1 = Math.min(W - 3, Math.ceil(tx + 14));
    for (let by = y0; by < y1; by++) {
      for (let bx = x0; bx < x1; bx++) {
        if (!spotOk(bx, by, w, h)) continue;
        const cxx = bx + w / 2;
        const cyy = by + h / 2;
        // jangan menutup plaza batu
        if (((cxx - pcx) / 6.4) ** 2 + ((cyy - pcy) / 5.5) ** 2 < 1) continue;
        let far = true;
        for (const o of [...stalls, ...props.filter((q) => q.kind === 'shop' || q.kind === 'fountain')]) {
          if (Math.hypot(cxx - (o.x + (o.w || 1) / 2), cyy - (o.y + (o.h || 1) / 2)) < minFar) { far = false; break; }
        }
        if (!far) continue;
        const d = Math.hypot(cxx - tx, cyy - ty);
        if (d < bd) { bd = d; best = [bx, by]; }
      }
    }
    return best;
  };
  const stallDefs = [
    { name: 'Warung Ikan Bakar', role: 'Makanan', t: G(600, 400), variant: 0 },
    { name: 'Toko Umpan', role: 'Cacing · Udang', t: G(830, 330), variant: 1 },
    { name: 'Toko Hiasan', role: 'Lentera · Kerang', t: G(690, 530), variant: 2 },
    { name: 'Kedai Kelapa', role: 'Minuman', t: G(1010, 430), variant: 3 },
  ];
  for (const d of stallDefs) {
    const at = bestSpot(d.t[0], d.t[1], 3, 2, 6);
    if (!at) continue;
    const pr: Prop = { kind: 'stall', x: at[0], y: at[1], v: d.variant + rnd() * 0.9, w: 3, h: 2, name: d.name, role: d.role };
    props.push(pr);
    stalls.push(pr);
    for (let yy = at[1]; yy < at[1] + 2; yy++) for (let xx = at[0]; xx < at[0] + 3; xx++) occ[yy][xx] = true;
    if (spotOk(at[0] + 3, at[1] + 1, 1, 1)) place('barrel', at[0] + 3, at[1] + 1);
    if (spotOk(at[0] - 1, at[1] + 1, 1, 1)) place('crate', at[0] - 1, at[1] + 1);
  }
  // jaring jemuran dekat dermaga timur
  for (const c of [[eastP[0] - 6, eastP[1] - 3], [eastP[0] - 6, eastP[1] + 3], [eastP[0] - 8, eastP[1] - 3]] as [number, number][]) {
    if (spotOk(c[0], c[1], 2, 1)) { putBlock('net', [c], 2, 1); break; }
  }
  // payung pantai di pasir
  let umb = 0;
  const umbs: [number, number][] = [];
  for (let k = 0; k < 900 && umb < 9; k++) {
    const ux = 3 + Math.floor(rnd() * (W - 8));
    const uy = 3 + Math.floor(rnd() * (H - 8));
    if (tiles[uy][ux] !== 'sand' || ds[uy][ux] < 2 || ds[uy][ux] > 3 || !spotOk(ux, uy, 1, 1)) continue;
    if (umbs.some(([a, b]) => Math.hypot(a - ux, b - uy) < 9)) continue;
    umbs.push([ux, uy]);
    place('umbrella', ux, uy);
    umb++;
  }
  // hutan pinus di barat laut (kotak gambar referensi 420..770 x 85..300) + sedikit pinus di tempat lain
  const inForest = (x: number, y: number) => {
    const gx = (x - 4.67) * 17.4;
    const gy = (y - 5.5) * 17.4;
    return gx > 410 && gx < 770 && gy > 80 && gy < 300;
  };
  const campC = camp ? [camp[0] + 1, camp[1]] : [36, 21];
  const noDirtNear = (x: number, y: number) => tiles[y][x - 1] !== 'dirt' && tiles[y][x + 1] !== 'dirt' && tiles[y - 1][x] !== 'dirt' && tiles[y + 1][x] !== 'dirt' && tiles[y][x] !== 'dirt';
  for (let y = 3; y < H - 3; y++) {
    for (let x = 3; x < W - 3; x++) {
      if (tiles[y][x] !== 'grass' || occ[y][x] || !noDirtNear(x, y)) continue;
      if (near(x, y, start.x, start.y, 3) || ds[y][x] < 3 || dw[y][x] < 2) continue;
      if (Math.hypot(x - pcx, y - pcy) < 7.5) continue;
      if (Math.hypot(x - campC[0], y - campC[1]) < 3.2) continue;
      const neighOcc = occ[y][x - 1] || occ[y - 1][x] || occ[y - 1][x + 1] || occ[y - 1][x - 1];
      const lr = occ[y][x - 1] || occ[y - 1][x];
      const gx = (x - 4.67) * 17.4;
      const gy = (y - 5.5) * 17.4;
      const grove = (gx > 860 && gx < 1140 && gy > 400 && gy < 650) || (gx > 230 && gx < 570 && gy > 530 && gy < 650) || (gx > 880 && gx < 1180 && gy > 120 && gy < 240);
      if (inForest(x, y)) {
        if (!lr && rnd() < 0.55) place('pine', x, y);
      } else if (grove) {
        if (!lr && rnd() < 0.42) {
          if (rnd() < 0.5) place('pine', x, y);
          else { place('palm', x, y); if (rnd() < 0.8) props[props.length - 1].role = 'fruit'; }
        }
      } else if (!neighOcc && rnd() < 0.07) {
        place('palm', x, y);
        if (rnd() < 0.8) props[props.length - 1].role = 'fruit';
      } else if (!neighOcc && rnd() < 0.012) {
        place('pine', x, y);
      }
    }
  }
  // semak dan bunga di rumput
  let bu = 0;
  for (let k = 0; k < 1500 && bu < 40; k++) {
    const bx = 3 + Math.floor(rnd() * (W - 8));
    const by = 3 + Math.floor(rnd() * (H - 8));
    if (tiles[by][bx] !== 'grass' || occ[by][bx] || ds[by][bx] < 3 || !noDirtNear(bx, by)) continue;
    place('bush', bx, by);
    bu++;
  }
  let fl = 0;
  for (let k = 0; k < 3000 && fl < 110; k++) {
    const fx = 3 + Math.floor(rnd() * (W - 8));
    const fy = 3 + Math.floor(rnd() * (H - 8));
    if (tiles[fy][fx] !== 'grass' || occ[fy][fx] || ds[fy][fx] < 3) continue;
    props.push({ kind: 'flowers', x: fx, y: fy, v: rnd() });
    fl++;
  }
  // batu & pohon di pasir
  for (let y = 3; y < H - 3; y++) {
    for (let x = 3; x < W - 3; x++) {
      if (tiles[y][x] !== 'sand' || occ[y][x] || ds[y][x] < 3) continue;
      const neighOcc = occ[y][x - 1] || occ[y - 1][x] || occ[y - 1][x + 1] || occ[y - 1][x - 1];
      if (neighOcc || near(x, y, start.x, start.y, 3)) continue;
      if (rnd() < 0.03) place('palm', x, y);
      else if (rnd() < 0.03) place('rock', x, y);
    }
  }
  // perahu kecil di air dangkal
  const boats: [number, number][] = [];
  for (let by = H - 12; by > 6 && boats.length < 3; by--) {
    for (let bx = 4; bx < W - 6 && boats.length < 3; bx++) {
      if (tiles[by][bx] === 'shallow' && tiles[by][bx + 1] === 'shallow' && tiles[by][bx + 2] === 'shallow' && dl[by][bx] <= 2 && !pierTiles.some(([a, b]) => Math.abs(a - bx) < 4 && Math.abs(b - by) < 3) && !boats.some(([a, b]) => Math.hypot(a - bx, b - by) < 14)) {
        boats.push([bx, by]);
        props.push({ kind: 'boat', x: bx, y: by, v: rnd(), w: 2, h: 1 });
      }
    }
  }
  // ikan raksasa pamer di selatan dermaga selatan
  const fishW = 16;
  const fishH = 6;
  props.push({ kind: 'giantfish', x: Math.max(1, south[0] - 7), y: Math.min(H - fishH - 1, south[1] + 9), v: rnd(), w: fishW, h: fishH, name: 'Ikan Raksasa Pulau', role: 'Pamer di sini!' });
  // lampu di pangkal dermaga
  for (const [lx, ly] of [[south[0] - 1, south[1] - 2], [south[0] + 2, south[1] - 2], [eastP[0] - 2, eastP[1] - 1], [eastP[0] - 2, eastP[1] + 2]] as [number, number][]) {
    if (ly > 0 && ly < H && lx > 0 && lx < W && (tiles[ly][lx] === 'sand' || tiles[ly][lx] === 'grass') && !occ[ly][lx]) place('lamp', lx, ly);
  }

  const blocked: boolean[][] = [];
  for (let y = 0; y < H; y++) {
    blocked[y] = [];
    for (let x = 0; x < W; x++) {
      const t = tiles[y][x];
      blocked[y][x] = (t === 'deep' || t === 'shallow') || occ[y][x] || x === 0 || y === 0;
    }
  }

  const world: World = { w: W, h: H, tiles, blocked, props, start, terrain: mk(W * TILE, H * TILE) };
  renderTerrain(world, dl, pond, pierTiles, seed, plaza);
  return world;
}

// noise halus (value noise) untuk bercak warna alami di pasir & rumput
function hash2(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function renderTerrain(world: World, dl: number[][], pond: boolean[][], pier: [number, number][], seed: number, plaza: Set<string>) {
  const ctx = world.terrain.getContext('2d') as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  const { w, h, tiles } = world;
  const isLand = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && (tiles[y][x] === 'sand' || tiles[y][x] === 'grass');
  const isWaterT = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && (tiles[y][x] === 'deep' || tiles[y][x] === 'shallow');
  const isDirtT = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && tiles[y][x] === 'dirt';
  // ujung jalan tanah menyebar ke tile sebelah (pasir/rumput) supaya tepinya tidak kaku
  const spillDirt = (tx: number, ty: number, X: number, Y: number, rnd: () => number) => {
    const sides: [number, number, number][] = [[0, -1, 0], [0, 1, 1], [-1, 0, 2], [1, 0, 3]];
    for (const [dx, dy, sd] of sides) {
      if (!isDirtT(tx + dx, ty + dy)) continue;
      for (let k = 0; k < 20; k++) {
        const along = Math.floor(rnd() * TILE);
        const depth = Math.floor(rnd() * rnd() * 3.6);
        const px = sd === 2 ? X + depth : sd === 3 ? X + TILE - 1 - depth : X + along;
        const py = sd === 0 ? Y + depth : sd === 1 ? Y + TILE - 1 - depth : Y + along;
        R(ctx, px, py, 1, 1, rnd() < 0.55 ? '#b48a5c' : '#9b7248');
      }
    }
  };
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const rnd = mulberry32(seed * 7919 + ty * 131 + tx * 17);
      const X = tx * TILE;
      const Y = ty * TILE;
      const t = tiles[ty][tx];
      if (plaza.has(tx + ',' + ty)) {
        // paving batu bulat tak beraturan (sel acak, nat gelap tipis), nyambung antar petak
        const CELL = 6;
        const stones = ['#e8c98d', '#dcbc86', '#d2b07c', '#e6d09e', '#d8c294'];
        for (let j = 0; j < TILE; j++) {
          for (let i = 0; i < TILE; i++) {
            const wx = X + i;
            const wy = Y + j;
            const gx = Math.floor(wx / CELL);
            const gy = Math.floor(wy / CELL);
            let d1 = 1e9, d2 = 1e9, bid = 0;
            for (let oy2 = -1; oy2 <= 1; oy2++) {
              for (let ox2 = -1; ox2 <= 1; ox2++) {
                const cgx = gx + ox2;
                const cgy = gy + oy2;
                const fx = (cgx + 0.2 + 0.6 * hash2(cgx, cgy, seed + 31)) * CELL;
                const fy = (cgy + 0.2 + 0.6 * hash2(cgx, cgy, seed + 57)) * CELL;
                const dd = Math.hypot(wx + 0.5 - fx, wy + 0.5 - fy);
                if (dd < d1) { d2 = d1; d1 = dd; bid = cgx * 73856093 ^ cgy * 19349663; } else if (dd < d2) d2 = dd;
              }
            }
            const hv = hash2(bid & 1023, (bid >> 10) & 1023, seed + 3);
            if (d2 - d1 < 1.1) R(ctx, wx, wy, 1, 1, '#a98a5e');
            else R(ctx, wx, wy, 1, 1, stones[Math.floor(hv * stones.length) % stones.length]);
          }
        }
        const isPl = (ax: number, ay: number) => plaza.has(ax + ',' + ay);
        if (!isPl(tx, ty - 1)) R(ctx, X, Y, TILE, 1, '#8f6f48');
        if (!isPl(tx, ty + 1)) R(ctx, X, Y + TILE - 1, TILE, 1, '#8f6f48');
        if (!isPl(tx - 1, ty)) R(ctx, X, Y, 1, TILE, '#8f6f48');
        if (!isPl(tx + 1, ty)) R(ctx, X + TILE - 1, Y, 1, TILE, '#8f6f48');
        continue;
      }
      if (t === 'grass') {
        R(ctx, X, Y, TILE, TILE, '#62a844');
        for (let i = 0; i < 7; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, '#4a8d3a');
        for (let i = 0; i < 5; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, '#82bf55');
        for (let i = 0; i < 2; i++) { const bx = X + 1 + rnd() * 13; const by = Y + 2 + rnd() * 12; R(ctx, bx, by, 1, 2, '#3f8a45'); R(ctx, bx + 1, by - 1, 1, 1, '#3f8a45'); }
        if (rnd() < 0.13) {
          const cols = ['#fff6a0', '#ff9ec8', '#ffffff', '#ffb36b'];
          const c = cols[Math.floor(rnd() * cols.length)];
          const fx = X + 3 + Math.floor(rnd() * 9);
          const fy = Y + 3 + Math.floor(rnd() * 9);
          R(ctx, fx, fy + 1, 1, 2, '#3f8a45');
          R(ctx, fx - 1, fy, 3, 1, c);
          R(ctx, fx, fy - 1, 1, 3, c);
          R(ctx, fx, fy, 1, 1, '#f5c542');
        }
        // bercak terang/gelap yang halus + rumpun rumput
        for (let j = 0; j < TILE; j++) {
          for (let i = 0; i < TILE; i++) {
            const n = vnoise((X + i) / 18, (Y + j) / 18, seed + 5);
            const hs = hash2(X + i, Y + j, seed + 9);
            if (n > 0.6 && ((i + j) & 1) === 0 && hs < 0.6) R(ctx, X + i, Y + j, 1, 1, '#8ad266');
            else if (n < 0.36 && ((i * 3 + j) & 3) === 0 && hs < 0.65) R(ctx, X + i, Y + j, 1, 1, '#4f9d45');
          }
        }
        if (rnd() < 0.3) { const gx = X + 2 + Math.floor(rnd() * 11); const gy = Y + 3 + Math.floor(rnd() * 10); R(ctx, gx, gy + 1, 1, 1, '#3a7d40'); R(ctx, gx - 1, gy, 1, 1, '#3a7d40'); R(ctx, gx + 1, gy, 1, 1, '#3a7d40'); R(ctx, gx, gy - 1, 1, 1, '#8fd47f'); }
        spillDirt(tx, ty, X, Y, rnd);
      } else if (t === 'sand') {
        R(ctx, X, Y, TILE, TILE, '#e8d194');
        for (let i = 0; i < 7; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, '#d8bd7c');
        for (let i = 0; i < 4; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, '#f4e3ae');
        if (rnd() < 0.05) { R(ctx, X + 5, Y + 7, 2, 1, '#fff'); R(ctx, X + 6, Y + 8, 1, 1, '#f1b6c8'); }
        // bercak pasir lebih terang/gelap
        for (let j = 0; j < TILE; j++) {
          for (let i = 0; i < TILE; i++) {
            const n = vnoise((X + i) / 20, (Y + j) / 20, seed + 3);
            const hs = hash2(X + i, Y + j, seed + 1);
            if (n > 0.62 && ((i + j) & 1) === 0 && hs < 0.55) R(ctx, X + i, Y + j, 1, 1, '#f4e4ae');
            else if (n < 0.34 && ((i * 3 + j) & 3) === 0 && hs < 0.6) R(ctx, X + i, Y + j, 1, 1, '#d9c07c');
          }
        }
        // pasir basah di dekat air
        const wet = ['rgba(168,126,64,0.30)', 'rgba(168,126,64,0.20)', 'rgba(168,126,64,0.10)'];
        for (let k = 0; k < 3; k++) {
          if (isWaterT(tx, ty - 1)) R(ctx, X, Y + k, TILE, 1, wet[k]);
          if (isWaterT(tx, ty + 1)) R(ctx, X, Y + TILE - 1 - k, TILE, 1, wet[k]);
          if (isWaterT(tx - 1, ty)) R(ctx, X + k, Y, 1, TILE, wet[k]);
          if (isWaterT(tx + 1, ty)) R(ctx, X + TILE - 1 - k, Y, 1, TILE, wet[k]);
        }
        // kerikil & cangkang
        if (rnd() < 0.08) { const kx = X + 2 + Math.floor(rnd() * 11); const ky = Y + 3 + Math.floor(rnd() * 10); R(ctx, kx, ky - 1, 2, 1, '#e6dfca'); R(ctx, kx, ky, 2, 1, '#b9ad92'); R(ctx, kx, ky + 1, 2, 1, '#8f846c'); }
        spillDirt(tx, ty, X, Y, rnd);
      } else if (t === 'dirt') {
        R(ctx, X, Y, TILE, TILE, '#b9825a');
        for (let i = 0; i < 9; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, '#9a6644');
        for (let i = 0; i < 6; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, '#cf9a70');
        if (rnd() < 0.35) { const qx = X + 2 + Math.floor(rnd() * 11); const qy = Y + 2 + Math.floor(rnd() * 11); R(ctx, qx, qy, 2, 1, '#d8c7a6'); R(ctx, qx, qy + 1, 2, 1, '#8c6a43'); }
        const isDirt = isDirtT;
        if (rnd() < 0.2) { const kx = X + 2 + Math.floor(rnd() * 11); const ky = Y + 3 + Math.floor(rnd() * 10); R(ctx, kx, ky, 2, 1, '#c9b48e'); R(ctx, kx, ky + 1, 2, 1, '#7a5a38'); }
        if (!isDirt(tx, ty - 1)) { R(ctx, X, Y, TILE, 1, '#cfa876'); R(ctx, X, Y + 1, TILE, 1, '#a07a4d'); }
        if (!isDirt(tx, ty + 1)) { R(ctx, X, Y + TILE - 2, TILE, 1, '#8f6c44'); R(ctx, X, Y + TILE - 1, TILE, 1, '#7c5b36'); }
        if (!isDirt(tx - 1, ty)) R(ctx, X, Y, 1, TILE, '#a07a4d');
        if (!isDirt(tx + 1, ty)) R(ctx, X + TILE - 1, Y, 1, TILE, '#8f6c44');
      } else {
        const d = Math.min(5, Math.max(0, dl[ty][tx] - 1));
        R(ctx, X, Y, TILE, TILE, WATER_COLORS[d]);
        if (pond[ty][tx]) {
          R(ctx, X, Y, TILE, TILE, '#3a8cbf');
          if (rnd() < 0.14) {
            const lx = X + 3 + Math.floor(rnd() * 8);
            const ly = Y + 4 + Math.floor(rnd() * 7);
            R(ctx, lx, ly, 4, 3, '#3f9d55'); R(ctx, lx + 1, ly - 1, 2, 1, '#3f9d55'); R(ctx, lx + 3, ly + 1, 1, 1, '#3a8cbf');
            if (rnd() < 0.5) R(ctx, lx + 1, ly, 1, 1, '#ffb7d5');
          }
        }
        // kilau air & riak gelap di perairan dalam
        if (!pond[ty][tx] && d >= 2 && rnd() < 0.22) { const lx = X + 2 + Math.floor(rnd() * 10); const ly = Y + 3 + Math.floor(rnd() * 10); R(ctx, lx, ly, 3, 1, 'rgba(255,255,255,0.26)'); R(ctx, lx + 1, ly + 1, 2, 1, 'rgba(255,255,255,0.13)'); }
        if (!pond[ty][tx] && d >= 3 && rnd() < 0.12) { const lx = X + 1 + Math.floor(rnd() * 11); const ly = Y + 2 + Math.floor(rnd() * 12); R(ctx, lx, ly, 4, 1, 'rgba(8,48,110,0.22)'); }
        // buih di tepi pantai
        const f = 'rgba(240,252,255,0.85)';
        if (isLand(tx, ty - 1)) for (let i = 0; i < TILE; i += 1) if ((i + tx) % 5 !== 0) R(ctx, X + i, Y, 1, i % 3 === 0 ? 2 : 1, f);
        if (isLand(tx, ty + 1)) for (let i = 0; i < TILE; i += 1) if ((i + tx) % 4 !== 0) R(ctx, X + i, Y + TILE - 1, 1, 1, f);
        if (isLand(tx - 1, ty)) for (let i = 0; i < TILE; i += 1) if ((i + ty) % 5 !== 0) R(ctx, X, Y + i, i % 3 === 0 ? 2 : 1, 1, f);
        if (isLand(tx + 1, ty)) for (let i = 0; i < TILE; i += 1) if ((i + ty) % 4 !== 0) R(ctx, X + TILE - 1, Y + i, 1, 1, f);
        // gelombang kedua yang lebih tipis, sedikit menjorok ke air
        const f2 = 'rgba(240,252,255,0.36)';
        if (isLand(tx, ty - 1)) for (let i = 0; i < TILE; i++) if ((i * 5 + tx * 3) % 7 < 3) R(ctx, X + i, Y + 2 + (i % 2), 1, 1, f2);
        if (isLand(tx, ty + 1)) for (let i = 0; i < TILE; i++) if ((i * 5 + tx * 3) % 7 < 3) R(ctx, X + i, Y + TILE - 3 - (i % 2), 1, 1, f2);
        if (isLand(tx - 1, ty)) for (let i = 0; i < TILE; i++) if ((i * 5 + ty * 3) % 7 < 3) R(ctx, X + 2 + (i % 2), Y + i, 1, 1, f2);
        if (isLand(tx + 1, ty)) for (let i = 0; i < TILE; i++) if ((i * 5 + ty * 3) % 7 < 3) R(ctx, X + TILE - 3 - (i % 2), Y + i, 1, 1, f2);
      }
    }
  }
  // dermaga
  const isPier = (x: number, y: number) => pier.some((p) => p[0] === x && p[1] === y);
  for (const [tx, ty] of pier) {
    const X = tx * TILE;
    const Y = ty * TILE;
    R(ctx, X, Y, TILE, TILE, '#b07a43');
    for (const lx of [3, 7, 11, 15]) R(ctx, X + lx, Y, 1, TILE, '#86592c');
    for (const lx of [0, 4, 8, 12]) R(ctx, X + lx, Y, 1, TILE, '#c68f55');
    if (!isPier(tx, ty - 1)) { R(ctx, X, Y, TILE, 2, '#6b4423'); R(ctx, X, Y + 2, TILE, 1, '#8c5d30'); }
    if (!isPier(tx, ty + 1)) { R(ctx, X, Y + TILE - 2, TILE, 2, '#6b4423'); R(ctx, X + 1, Y + TILE - 3, 2, 1, '#e0b36e'); }
    if (!isPier(tx, ty - 1) && tx % 2 === 0) R(ctx, X + 1, Y - 1, 3, 4, '#4f321a');
    if (!isPier(tx, ty + 1) && tx % 2 === 0) R(ctx, X + 1, Y + TILE - 3, 3, 4, '#4f321a');
  }
  for (const [tx, ty] of pier) {
    if (!isPier(tx, ty + 1) && ty + 1 < h) R(ctx, tx * TILE, (ty + 1) * TILE + 1, TILE, 4, 'rgba(0,30,60,0.22)');
  }
}

// ---------- properti ----------
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.22) {
  ctx.fillStyle = 'rgba(0,20,10,' + a + ')';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function fruitTreeRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const bx = p.x * TILE + 8;
  const by = p.y * TILE + 15;
  const disc = (cx: number, cy: number, r: number, col: string) => {
    for (let yy = -r; yy <= r; yy++) {
      const w = Math.floor(Math.sqrt(r * r - yy * yy + 0.5));
      R(ctx, cx - w, cy + yy, w * 2 + 1, 1, col);
    }
  };
  drawShadow(ctx, bx + 1, by, 9, 3);
  // batang
  R(ctx, bx - 2, by - 12, 5, 12, '#7a4a21');
  R(ctx, bx - 2, by - 12, 2, 12, '#98602d');
  R(ctx, bx + 2, by - 12, 1, 12, '#5d3a18');
  R(ctx, bx - 3, by - 2, 7, 2, '#7a4a21');
  // tajuk: beberapa lingkaran daun bertumpuk
  const top = by - 21;
  const blobs: [number, number, number][] = [[-8, 2, 7], [8, 2, 7], [0, -4, 9], [-5, -8, 6], [6, -8, 6], [0, 5, 7]];
  for (const [dx, dy, r] of blobs) disc(bx + dx, top + dy, r, '#2c7a3a');
  for (const [dx, dy, r] of blobs) disc(bx + dx, top + dy - 1, r - 1, '#3f9f4a');
  for (const [dx, dy, r] of blobs) disc(bx + dx - 1, top + dy - 3, Math.max(2, r - 3), '#62c45a');
  // bintik daun gelap
  for (let i = 0; i < 9; i++) R(ctx, bx - 11 + ((i * 7 + Math.floor(p.v * 20)) % 23), top - 8 + ((i * 5) % 17), 2, 1, '#2c7a3a');
  // buah (merah / oranye) tersebar tetap menurut p.v
  const cols = p.v > 0.5 ? ['#e8483c', '#f59a2a'] : ['#f59a2a', '#e8483c'];
  for (let i = 0; i < 7; i++) {
    const fx = bx - 11 + ((i * 9 + Math.floor(p.v * 30)) % 23);
    const fy = top - 8 + ((i * 6 + Math.floor(p.v * 13)) % 17);
    R(ctx, fx, fy, 2, 2, cols[i % 2]);
    R(ctx, fx, fy, 1, 1, '#ffd0c0');
  }
}

export function drawPalm(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  if (p.role === 'fruit') { drawBaked(ctx, p, 'fruit' + Math.floor(p.v * 4), [48, 64, 16, 48], fruitTreeRaw); return; }
  const bx = p.x * TILE + 8;
  const by = p.y * TILE + 15;
  drawShadow(ctx, bx + 1, by, 8, 2.6);
  const sway = Math.sin(t * 1.2 + p.v * 9) * 1.4;
  const lean = (p.v - 0.5) * 6;
  const segs = 12;
  let tx = bx;
  let ty = by;
  for (let i = 0; i < segs; i++) {
    const k = i / segs;
    tx = bx + lean * k * k + sway * k * 0.6 + Math.sin(i * 0.4 + p.v * 5) * 0.8;
    ty = by - i * 2;
    R(ctx, tx - 1, ty - 2, 3, 2, i % 3 === 0 ? '#74491f' : '#9a6630');
    R(ctx, tx + 1, ty - 2, 1, 2, '#5d3a18');
  }
  const cx = Math.round(tx);
  const cy = Math.round(ty - 2);
  const angles = [-2.9, -2.35, -1.8, -1.3, -0.8, -0.25, 0.0, 3.1];
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i] + Math.sin(t * 1.5 + i + p.v * 6) * 0.06;
    const len = i % 2 === 0 ? 13 : 11;
    for (let s = 0.12; s <= 1; s += 0.075) {
      const fx = cx + Math.cos(a) * len * s;
      const fy = cy + Math.sin(a) * len * s * 0.55 + s * s * 7.5;
      const light = (i + Math.round(s * 10)) % 2 === 0;
      R(ctx, fx, fy, 2, 2, light ? '#3fae5a' : '#2a8a49');
      if (s > 0.35 && s < 0.9) R(ctx, fx, fy + 2, 1, 1, '#1f6e3b');
    }
  }
  R(ctx, cx - 1, cy + 1, 2, 2, '#6b3f17');
  R(ctx, cx + 1, cy + 2, 2, 2, '#7a4a1d');
}

function rockRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const x = p.x * TILE + 8;
  const y = p.y * TILE + 13;
  drawShadow(ctx, x, y + 1, 7, 2.4, 0.25);
  const big = p.v > 0.5;
  const rx = big ? 6 : 5;
  const ry = big ? 5 : 4;
  for (let yy = -ry - 1; yy <= ry + 1; yy++) {
    for (let xx = -rx - 1; xx <= rx + 1; xx++) {
      const d = (xx * xx) / ((rx + 0.5) * (rx + 0.5)) + (yy * yy) / ((ry + 0.5) * (ry + 0.5));
      if (d > 1) continue;
      let col = '#8f9aa5';
      if (xx + yy < -rx * 0.5) col = '#adb8c2';
      else if (xx + yy > rx * 0.6) col = '#6c7883';
      if (d > 0.78) col = darken(col, 0.18);
      R(ctx, x + xx, y + yy - ry + 1, 1, 1, col);
    }
  }
  R(ctx, x - 2, y - ry + 1, 2, 1, '#cfd8df');
}

export function drawLamp(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  const x = p.x * TILE + 8;
  const y = p.y * TILE + 15;
  drawShadow(ctx, x + 1, y, 5, 1.8, 0.25);
  R(ctx, x - 1, y - 18, 2, 18, '#4b3621');
  R(ctx, x - 2, y - 2, 4, 2, '#3a2a18');
  R(ctx, x - 4, y - 26, 8, 2, '#3a2a18');
  R(ctx, x - 3, y - 24, 6, 7, '#ffd36a');
  R(ctx, x - 2, y - 23, 2, 4, '#fff1b8');
  R(ctx, x - 3, y - 24, 6, 1, '#3a2a18');
  R(ctx, x - 3, y - 18, 6, 1, '#3a2a18');
  R(ctx, x - 1, y - 28, 2, 2, '#3a2a18');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y - 21, 1, x, y - 21, 26);
  const a = 0.3 + Math.sin(t * 2 + p.v * 8) * 0.04;
  g.addColorStop(0, 'rgba(255,200,90,' + a + ')');
  g.addColorStop(1, 'rgba(255,200,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 28, y - 49, 56, 56);
  ctx.restore();
}

// ---------- karakter ----------
export interface RodGeo { hx: number; hy: number; tx: number; ty: number }
export function rodGeometry(x: number, y: number, dir: Dir, shake = 0): RodGeo {
  switch (dir) {
    case 'down': return { hx: x + 5, hy: y - 8, tx: x + 14 + shake, ty: y + 2 };
    case 'up': return { hx: x + 5, hy: y - 9, tx: x + 12 + shake, ty: y - 26 };
    case 'left': return { hx: x - 5, hy: y - 8, tx: x - 19, ty: y - 14 + shake };
    default: return { hx: x + 5, hy: y - 8, tx: x + 19, ty: y - 14 + shake };
  }
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, col: string, size = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  ctx.fillStyle = col;
  for (let i = 0; i <= n; i++) {
    const k = n === 0 ? 0 : i / n;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k), size, size);
  }
}

// ---------- skin joran (tampil di tangan karakter) ----------
export type RodStyle = 'wood' | 'stripe' | 'weave' | 'shine' | 'gem' | 'crystal' | 'moon' | 'dragon' | 'seadragon' | 'tentacle';
export interface RodSkin { shaft: string; shaftD: string; grip: string; tip: string; ring: string; glow?: string; spark?: string; style?: RodStyle; reel?: string; accent?: string }
export const ROD_SKINS: Record<string, RodSkin> = {
  default: { shaft: '#8a5a2b', shaftD: '#5e3a18', grip: '#3d2610', tip: '#e8d9b0', ring: '#b88a4a', style: 'wood' },
  fiber: { shaft: '#3fb7a6', shaftD: '#26857a', grip: '#1f4a45', tip: '#d8fff6', ring: '#8ff0df', style: 'stripe' },
  karbon: { shaft: '#2b2f3a', shaftD: '#14171f', grip: '#c0392b', tip: '#ff6b5e', ring: '#5a6073', style: 'weave' },
  perak: { shaft: '#c9d3df', shaftD: '#8c99ab', grip: '#3e5a8a', tip: '#ffffff', ring: '#eaf2ff', glow: '#bcd8ff', style: 'shine' },
  emas: { shaft: '#f2c230', shaftD: '#b8860b', grip: '#6b3f12', tip: '#fff3b0', ring: '#ffe27a', glow: '#ffd24a', spark: '#fff6c8', style: 'gem' },
  kristal: { shaft: '#58d6ff', shaftD: '#2b8fc9', grip: '#2a3f7a', tip: '#e6fbff', ring: '#a8ecff', glow: '#7df9ff', spark: '#ffffff', style: 'crystal' },
  bulan: { shaft: '#d9d2ff', shaftD: '#8f86d6', grip: '#3a2f78', tip: '#fffbe0', ring: '#f0ecff', glow: '#c9bfff', spark: '#fff7c2', style: 'moon' },
  naga: { shaft: '#1f9bd1', shaftD: '#0d4f7a', grip: '#12303f', tip: '#c9f6ff', ring: '#6fe3ff', glow: '#2fd0ff', spark: '#d8fbff', style: 'seadragon' },
  sisik: { shaft: '#d9482b', shaftD: '#7a1d14', grip: '#2a1a10', tip: '#ffe27a', ring: '#ffb347', glow: '#ff7a3a', spark: '#ffd27a', style: 'dragon' },
  tentakel: { shaft: '#8e44d6', shaftD: '#4a1d7a', grip: '#1a1030', tip: '#f0b8ff', ring: '#c58bff', glow: '#b05cff', spark: '#f6d6ff', style: 'tentacle' },
};

// Posisi joran saat dipegang santai (belum dilempar): tegak di samping badan
export function holdGeometry(x: number, y: number, dir: Dir): RodGeo {
  switch (dir) {
    case 'down': return { hx: x + 5, hy: y - 8, tx: x + 10, ty: y - 27 };
    case 'up': return { hx: x + 5, hy: y - 9, tx: x + 9, ty: y - 28 };
    case 'left': return { hx: x - 5, hy: y - 8, tx: x - 10, ty: y - 28 };
    default: return { hx: x + 5, hy: y - 8, tx: x + 10, ty: y - 28 };
  }
}

export function drawRodSkin(ctx: CanvasRenderingContext2D, g: RodGeo, rodId: string, skinCol: string) {
  const sk = ROD_SKINS[rodId] || ROD_SKINS.default;
  const t = performance.now() / 1000;
  const dx = g.tx - g.hx;
  const dy = g.ty - g.hy;
  const len = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
  const nx = -dy / (Math.hypot(dx, dy) || 1); // arah tegak lurus joran
  const ny = dx / (Math.hypot(dx, dy) || 1);
  const at = (k: number): [number, number] => [Math.round(g.hx + dx * k), Math.round(g.hy + dy * k)];

  // cahaya lembut di sekitar joran langka
  if (sk.glow) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const [mx, my] = at(0.55);
    const gr = ctx.createRadialGradient(mx, my, 1, mx, my, 13);
    gr.addColorStop(0, sk.glow + '55');
    gr.addColorStop(1, sk.glow + '00');
    ctx.fillStyle = gr;
    ctx.fillRect(mx - 14, my - 14, 28, 28);
    ctx.restore();
  }

  // batang: garis tepi gelap + badan + genggaman
  line(ctx, g.hx, g.hy, g.tx, g.ty, sk.shaftD, 2);
  line(ctx, g.hx, g.hy, g.tx, g.ty, sk.shaft, 1);
  line(ctx, g.hx, g.hy, g.hx + dx * 0.28, g.hy + dy * 0.28, sk.grip, 2);
  const acc = sk.accent || sk.ring;

  // pola khas tiap joran
  for (let i = 0; i <= len; i++) {
    const k = i / len;
    const [px, py] = at(k);
    switch (sk.style) {
      case 'wood': if (k > 0.3 && i % 5 === 0) R(ctx, px, py, 2, 1, acc); break;
      case 'stripe': if (k > 0.3 && i % 6 < 2) R(ctx, px, py, 1, 1, acc); break;
      case 'weave': if (k > 0.3 && i % 2 === 0) R(ctx, px, py, 1, 1, i % 4 === 0 ? acc : '#4a5062'); break;
      case 'shine': {
        const pos = (t * 0.8) % 1.4;
        if (k > 0.3 && Math.abs(k - pos) < 0.07) R(ctx, px, py, 1, 1, '#ffffff');
        if (k > 0.3 && i % 7 === 0) R(ctx, px, py, 1, 1, acc);
        break;
      }
      case 'gem': if (k > 0.3 && i % 4 === 0) R(ctx, px, py, 1, 1, '#fff3b0'); break;
      case 'crystal': if (k > 0.3 && i % 4 === 0) R(ctx, px, py, 1, 1, i % 8 === 0 ? '#ffffff' : acc); break;
      case 'moon': if (k > 0.3 && i % 5 === 0) R(ctx, px, py, 1, 1, i % 10 === 0 ? '#fff7c2' : '#8f86d6'); break;
      case 'seadragon': if (k > 0.3) R(ctx, px + Math.round(Math.sin(i * 0.9 + t * 3)), py, 1, 1, i % 2 === 0 ? acc : '#0d4f7a'); break;
      case 'tentacle': if (k > 0.3 && i % 3 === 0) R(ctx, px + (i % 6 === 0 ? 1 : 0), py, 1, 1, i % 6 === 0 ? acc : '#4a1d7a'); break;
      case 'dragon': if (k > 0.3) { if (i % 4 === 0) R(ctx, px, py, 2, 1, '#ffb347'); else if (i % 4 === 2) R(ctx, px, py, 1, 1, '#7a1d14'); } break;
      default: break;
    }
  }

  // kumparan (reel) dekat genggaman
  const [rx, ry] = at(0.16);
  const bx = Math.round(rx + nx * 2);
  const by = Math.round(ry + ny * 2);
  R(ctx, bx - 1, by - 1, 3, 3, sk.shaftD);
  R(ctx, bx - 1, by - 1, 2, 2, sk.reel || sk.ring);
  R(ctx, bx, by, 1, 1, sk.shaftD);
  R(ctx, bx + 1, by + 1, 1, 1, acc);

  // pemandu tali
  for (const k of [0.5, 0.72, 0.9]) {
    const [qx, qy] = at(k);
    R(ctx, qx, qy, 2, 2, sk.ring);
  }

  // hiasan khusus
  const [tx, ty] = [g.tx, g.ty];
  if (sk.style === 'gem') {
    const [qx, qy] = at(0.3);
    R(ctx, qx - 1, qy - 1, 3, 3, '#7a1d36');
    R(ctx, qx - 1, qy - 1, 2, 2, acc);
    R(ctx, qx - 1, qy - 1, 1, 1, '#ffffff');
    // kilau koin emas berkedip di batang
    for (let i = 0; i < 3; i++) {
      const ph = (t * 1.1 + i * 0.37) % 1;
      if (ph < 0.3) {
        const [wx, wy] = at(0.5 + i * 0.2);
        ctx.globalAlpha = Math.sin((ph / 0.3) * Math.PI);
        R(ctx, wx, wy - 2, 1, 5, '#fff6c8');
        R(ctx, wx - 2, wy, 5, 1, '#fff6c8');
      }
    }
    ctx.globalAlpha = 1;
    // koin emas kecil jatuh dari ujung
    for (let i = 0; i < 2; i++) {
      const k = (t * 0.8 + i * 0.5) % 1;
      ctx.globalAlpha = 1 - k;
      const cx0 = tx + (i ? 3 : -2);
      R(ctx, cx0, Math.round(ty + 2 + k * 9), 2, 2, '#ffd24a');
      R(ctx, cx0, Math.round(ty + 2 + k * 9), 1, 1, '#fff3b0');
    }
    ctx.globalAlpha = 1;
  } else if (sk.style === 'crystal') {
    for (const k of [0.46, 0.66, 0.86]) {
      const [qx, qy] = at(k);
      const ox = Math.round(qx + nx * 2);
      const oy = Math.round(qy + ny * 2);
      R(ctx, ox, oy - 1, 1, 3, sk.tip);
      R(ctx, ox - 1, oy, 3, 1, sk.tip);
      R(ctx, ox, oy, 1, 1, '#58d6ff');
    }
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5);
    R(ctx, tx - 1, ty - 2, 3, 1, '#ffffff');
    R(ctx, tx, ty - 3, 1, 3, '#ffffff');
    ctx.globalAlpha = 1;
    // petir menyambar dari ujung (Kristal Badai)
    const ph = (t * 0.9) % 1;
    if (ph < 0.18) {
      ctx.globalAlpha = 1 - ph / 0.18;
      const off = [-1, 2, -2, 1, -1];
      let bx = tx;
      let by = ty - 3;
      for (let s2 = 0; s2 < 5; s2++) {
        bx += off[(s2 + Math.floor(t * 9)) % 5];
        by -= 2;
        R(ctx, bx, by, 1, 2, '#ffffff');
        R(ctx, bx + 1, by, 1, 2, '#7df9ff');
      }
      ctx.globalAlpha = 1;
    }
  } else if (sk.style === 'moon') {
    R(ctx, tx - 1, ty - 3, 2, 1, sk.tip);
    R(ctx, tx - 2, ty - 2, 1, 3, sk.tip);
    R(ctx, tx - 1, ty + 1, 2, 1, sk.tip);
    R(ctx, tx, ty - 2, 1, 1, sk.ring);
    R(ctx, tx, ty, 1, 1, sk.ring);
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + i * 2.1;
      ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 3 + i));
      R(ctx, Math.round(tx + Math.cos(a) * 6), Math.round(ty - 1 + Math.sin(a) * 4), 1, 1, '#fff7c2');
    }
    ctx.globalAlpha = 1;
  } else if (sk.style === 'dragon') {
    // kepala naga di ujung joran
    R(ctx, tx - 1, ty - 2, 4, 3, '#7a1d14');
    R(ctx, tx - 1, ty - 2, 3, 1, sk.shaft);
    R(ctx, tx + 2, ty - 1, 2, 1, '#7a1d14');
    R(ctx, tx + 1, ty - 1, 1, 1, '#ffe27a');
    R(ctx, tx - 2, ty - 3, 1, 2, acc);
    R(ctx, tx + 1, ty - 3, 1, 2, acc);
    // api naik dari ujung
    for (let i = 0; i < 5; i++) {
      const k = (t * 1.3 + i / 5) % 1;
      ctx.globalAlpha = Math.max(0, 1 - k);
      R(ctx, Math.round(tx + Math.sin(t * 6 + i * 2) * 1.5), Math.round(ty - 3 - k * 10), 1, 1, k < 0.35 ? '#fff2a0' : k < 0.7 ? '#ff9a3a' : '#ff3b1e');
    }
    ctx.globalAlpha = 1;
    // bara api melayang naik dari batang (Sisik Naga)
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.9 + i / 4) % 1;
      const [ex, ey] = at(0.4 + i * 0.18);
      ctx.globalAlpha = 1 - k;
      R(ctx, Math.round(ex + Math.sin(t * 5 + i * 2) * 1.5), Math.round(ey - 2 - k * 9), 1, 1, k < 0.5 ? '#ffb347' : '#ff3b1e');
    }
    ctx.globalAlpha = 1;
  } else if (sk.style === 'seadragon') {
    // kepala naga laut: sirip gelombang, mata putih, tanpa api
    R(ctx, tx - 1, ty - 2, 4, 3, '#0d4f7a');
    R(ctx, tx - 1, ty - 2, 3, 1, sk.shaft);
    R(ctx, tx + 2, ty - 1, 2, 1, '#0d4f7a');
    R(ctx, tx + 1, ty - 1, 1, 1, '#ffffff');
    R(ctx, tx - 3, ty - 1, 2, 1, acc);
    R(ctx, tx - 4, ty, 2, 1, sk.shaft);
    R(ctx, tx - 2, ty - 3, 2, 1, acc);
    // tetes air menetes dari batang
    for (let i = 0; i < 4; i++) {
      const k = (t * 1.0 + i / 4) % 1;
      const [wx, wy] = at(0.35 + i * 0.18);
      ctx.globalAlpha = 1 - k;
      R(ctx, wx + (i % 2 ? 1 : -1), Math.round(wy + 2 + k * 10), 1, 2, '#bff3ff');
    }
    ctx.globalAlpha = 1;
  } else if (sk.style === 'tentacle') {
    // sulur laut dalam menggeliat dari ujung + titik cahaya biru-ungu
    for (let j = 0; j < 3; j++) {
      for (let s2 = 1; s2 <= 5; s2++) {
        const wx = Math.round(tx + (j - 1) * 2 + Math.sin(t * 3 + j * 2 + s2 * 0.7) * s2 * 0.8);
        R(ctx, wx, ty - 1 - s2 * 2 + (j === 1 ? -1 : 0), 1, 2, s2 === 5 ? '#f6d6ff' : j === 1 ? '#8e44d6' : '#c58bff');
      }
    }
    for (let i = 0; i < 4; i++) {
      const [wx, wy] = at(0.4 + i * 0.16);
      ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 2.5 + i * 1.3));
      R(ctx, wx + 1, wy, 1, 1, '#7df9ff');
    }
    ctx.globalAlpha = 1;
  } else if (sk.style === 'shine') {
    // gelembung laut kecil naik dari ujung (Perak Laut)
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.7 + i / 3) % 1;
      ctx.globalAlpha = 1 - k;
      R(ctx, Math.round(tx + 1 + Math.sin(t * 3 + i * 2) * 2), Math.round(ty - 2 - k * 10), 2, 2, '#eaf2ff');
      R(ctx, Math.round(tx + 1 + Math.sin(t * 3 + i * 2) * 2), Math.round(ty - 2 - k * 10), 1, 1, '#ffffff');
    }
    ctx.globalAlpha = 1;
  } else if (sk.style === 'weave') {
    // percik listrik merah kecil di ujung (Karbon)
    if (Math.sin(t * 11) > 0.55) {
      R(ctx, tx + 2, ty - 2, 1, 1, '#ff6b5e');
      R(ctx, tx - 1, ty - 3, 1, 1, '#ffffff');
    }
  }

  // ujung joran dan cahaya ujung
  R(ctx, tx, ty, 2, 2, sk.tip);
  if (sk.glow) {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 4);
    ctx.fillStyle = sk.glow;
    ctx.beginPath();
    ctx.arc(tx + 1, ty + 1, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // kilau berjalan sepanjang joran
  if (sk.spark && sk.style === 'moon') {
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.7 + i / 3) % 1;
      const sx = Math.round(g.hx + dx * k + Math.sin(t * 5 + i * 2) * 2);
      const sy = Math.round(g.hy + dy * k - 2 + Math.cos(t * 4 + i) * 1.5);
      ctx.globalAlpha = Math.max(0, Math.sin(k * Math.PI));
      R(ctx, sx, sy - 1, 1, 3, sk.spark);
      R(ctx, sx - 1, sy, 3, 1, sk.spark);
    }
    ctx.globalAlpha = 1;
  }
  R(ctx, g.hx - 1, g.hy, 2, 2, skinCol);
}

// Gambar joran sendirian (untuk ikon di Toko / Gacha): sama persis dengan yang dipegang karakter, plus tali & pelampung.
export const ROD_PREVIEW = 44;
export function drawRodPreview(ctx: CanvasRenderingContext2D, rodId: string) {
  const g: RodGeo = { hx: 7, hy: 38, tx: 34, ty: 15 };
  const t = performance.now() / 1000;
  drawRodSkin(ctx, g, rodId, '#f6d4b8');
  const by = 30 + Math.round(Math.sin(t * 2.2));
  line(ctx, g.tx + 1, g.ty + 1, g.tx + 3, by - 1, 'rgba(235,240,255,0.9)', 1);
  R(ctx, g.tx + 2, by, 3, 2, '#ff5a4d');
  R(ctx, g.tx + 2, by + 2, 3, 1, '#ffffff');
}

export interface Pal { skin: string; skinD: string; hair: string; shirt: string; shirtD: string; pants: string; boot: string; hat: string; hatD: string; band: string; cap?: boolean; nohat?: boolean; top?: string; fx?: 'night' | 'flame' }
export const PAL_PLAYER: Pal = { skin: '#fbd5bb', skinD: '#e6a98c', hair: '#5a3a28', shirt: '#3fa24a', shirtD: '#2a7a34', pants: '#3fa24a', boot: '#6a4426', hat: '#2b4375', hatD: '#1b2c52', band: '#f0c75a', nohat: true, top: '#f6eee0' };
export const PAL_BAYU: Pal = { skin: '#e2b48a', skinD: '#c4936a', hair: '#d9d6cf', shirt: '#6b9a4e', shirtD: '#527a3a', pants: '#c8a96a', boot: '#6b4a2a', hat: '#ead69a', hatD: '#c9b06a', band: '#8a5a2b' };

export function drawPlayerRaw(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Dir, moving: boolean, step: number, rod: boolean, rodShake = 0, pal: Pal = PAL_PLAYER, rodId = 'default', hold = false, armsUp = false) {
  const fr = moving ? Math.floor(step * 8) % 4 : 0;
  const bob = moving && (fr === 1 || fr === 3) ? -1 : 0;
  drawShadow(ctx, x, y - 1, 6, 2, 0.28);
  const ox = Math.round(x) - 8;
  const oy = Math.round(y) - 21 + bob;
  const flip = dir === 'right';
  ctx.save();
  if (flip) {
    ctx.translate(Math.round(x), 0);
    ctx.scale(-1, 1);
    ctx.translate(-Math.round(x), 0);
  }
  // karakter berproporsi manusia (kepala ~1/3 tinggi badan, lengan & kaki terpisah, lengan mengayun saat jalan)
  const legA=moving?(fr===1?-1:fr===3?1:0):0;
  const fx=pal.fx;
  const top=pal.top||'#f3e8d0', topD=darken(top,0.14);
  const sh=pal.shirt, shL=lighten(sh,0.2), shD=pal.shirtD, shDD=darken(sh,0.42);
  const hairL=lighten(pal.hair,0.28), hairD=darken(pal.hair,0.22);
  const pantsL=lighten(pal.pants,0.16), pantsD=darken(pal.pants,0.2);
  const bootL=lighten(pal.boot,0.25), bootD=darken(pal.boot,0.2), sole=fx==='night'?pal.band:darken(pal.boot,0.5);
  const belt='#3b2716', buckle=fx==='night'?pal.band:'#e8c15a';
  const cuff=fx==='night'?pal.band:top;
  const cape=top, capeD=darken(top,0.28), flameA='#ffd27a', flameB=pal.band||'#ff9b3a';
  const eye='#1d1d2b', blush='rgba(240,110,120,0.55)', mouth='#b5543f';
  const al=moving?(fr===1?1:fr===3?-1:0):0;
  const flameHem=(x0:number,w:number,y:number)=>{ for(let i=0;i<w;i++){ R(ctx,x0+i,y,1,(i%2)?2:1,i%3===0?flameA:flameB); } };
  if(dir==='down'||dir==='up'){
    const lf=legA<0?-1:0, rf=legA>0?-1:0;
    if(fx==='flame'&&dir==='down'){ R(ctx,ox+3,oy+10,10,8,capeD); R(ctx,ox+3,oy+10,1,8,cape); R(ctx,ox+12,oy+10,1,8,cape); flameHem(ox+3,10,oy+18); }
    // kaki + celana, ada sorotan & lipatan
    R(ctx,ox+4,oy+14,4,5+lf,pal.pants); R(ctx,ox+8,oy+14,4,5+rf,pal.pants);
    R(ctx,ox+4,oy+14,1,5+lf,pantsL); R(ctx,ox+11,oy+14,1,5+rf,pantsD);
    R(ctx,ox+7,oy+14,1,5+lf,pantsD); R(ctx,ox+8,oy+14,1,5+rf,pantsD);
    R(ctx,ox+5,oy+16+lf,2,1,pantsD); R(ctx,ox+9,oy+16+rf,2,1,pantsD);
    // sepatu bot: bibir atas terang, sol gelap
    R(ctx,ox+4,oy+19+lf,4,2,pal.boot); R(ctx,ox+8,oy+19+rf,4,2,pal.boot);
    R(ctx,ox+4,oy+19+lf,4,1,bootL); R(ctx,ox+8,oy+19+rf,4,1,bootL);
    R(ctx,ox+4,oy+20+lf,4,1,sole); R(ctx,ox+8,oy+20+rf,4,1,sole);
    // jaket/kemeja: sorotan kiri, bayangan kanan, kerah, kancing
    R(ctx,ox+4,oy+8,8,6,sh);
    R(ctx,ox+4,oy+8,8,1,shL); R(ctx,ox+4,oy+8,1,6,shL); R(ctx,ox+11,oy+8,1,6,shD); R(ctx,ox+4,oy+13,8,1,shD);
    if(dir==='down'){
      R(ctx,ox+7,oy+8,2,6,top);                    // kaus dalam di tengah (jaket terbuka)
      R(ctx,ox+7,oy+8,2,1,pal.skinD);              // leher
      R(ctx,ox+6,oy+8,1,2,shD); R(ctx,ox+9,oy+8,1,2,shD); // kerah
      R(ctx,ox+6,oy+10,1,4,fx==='night'?pal.band:shD); R(ctx,ox+9,oy+10,1,4,fx==='night'?pal.band:shD); // tepi jaket
      R(ctx,ox+7,oy+11,1,1,topD); R(ctx,ox+8,oy+12,1,1,topD);
      R(ctx,ox+5,oy+11,1,2,shDD); R(ctx,ox+5,oy+11,1,1,shD);  // saku kiri
      R(ctx,ox+10,oy+11,1,2,shDD);
      if(fx==='flame'){ R(ctx,ox+7,oy+10,2,2,'#ff7a1a'); R(ctx,ox+7,oy+10,1,1,flameA); }
      if(fx==='night'){ R(ctx,ox+5,oy+10,1,1,pal.band); R(ctx,ox+10,oy+9,1,1,pal.band); R(ctx,ox+5,oy+13,1,1,pal.band); }
    } else {
      R(ctx,ox+5,oy+8,6,1,top);                    // kerah belakang
      R(ctx,ox+7,oy+9,2,5,shD);                    // jahitan punggung
      R(ctx,ox+7,oy+9,1,5,sh);
      if(fx==='night'){ R(ctx,ox+6,oy+10,1,3,pal.band); R(ctx,ox+9,oy+10,1,3,pal.band); }
    }
    // ikat pinggang
    R(ctx,ox+4,oy+14,8,1,belt);
    if(dir==='down') R(ctx,ox+7,oy+14,2,1,buckle);
    if(fx==='flame'&&dir==='up'){ R(ctx,ox+4,oy+9,8,9,capeD); R(ctx,ox+4,oy+9,1,9,cape); R(ctx,ox+11,oy+9,1,9,cape); R(ctx,ox+7,oy+10,2,2,flameA); flameHem(ox+4,8,oy+18); }
    if(armsUp){
      R(ctx,ox+2,oy-6,2,16,sh); R(ctx,ox+12,oy-6,2,16,sh);
      R(ctx,ox+2,oy-6,1,16,shL); R(ctx,ox+13,oy-6,1,16,shD);
      R(ctx,ox+2,oy+8,2,1,cuff); R(ctx,ox+12,oy+8,2,1,cuff);
      R(ctx,ox+2,oy-8,2,2,pal.skin); R(ctx,ox+12,oy-8,2,2,pal.skin);
    } else {
      // lengan panjang berwarna jaket + manset, tangan kulit
      R(ctx,ox+2,oy+9+al,2,5,sh); R(ctx,ox+12,oy+9-al,2,5,sh);
      R(ctx,ox+2,oy+9+al,1,5,shL); R(ctx,ox+13,oy+9-al,1,5,shD);
      R(ctx,ox+2,oy+9+al,2,1,shL); R(ctx,ox+12,oy+9-al,2,1,sh);
      R(ctx,ox+2,oy+13+al,2,1,cuff); R(ctx,ox+12,oy+13-al,2,1,cuff);
      R(ctx,ox+2,oy+14+al,2,2,pal.skin); R(ctx,ox+12,oy+14-al,2,2,pal.skin);
      R(ctx,ox+3,oy+15+al,1,1,pal.skinD); R(ctx,ox+12,oy+15-al,1,1,pal.skinD);
    }
    // kepala
    if(dir==='down'){
      R(ctx,ox+5,oy+4,6,4,pal.skin);
      R(ctx,ox+5,oy+1,6,1,pal.hair);
      R(ctx,ox+4,oy+2,8,2,pal.hair);
      R(ctx,ox+4,oy+4,1,3,pal.hair); R(ctx,ox+11,oy+4,1,3,pal.hair);
      R(ctx,ox+5,oy+4,2,1,pal.hair); R(ctx,ox+9,oy+4,2,1,pal.hair);
      R(ctx,ox+5,oy+2,2,1,hairL);
      R(ctx,ox+6,oy+5,1,2,eye); R(ctx,ox+9,oy+5,1,2,eye);
      R(ctx,ox+5,oy+7,1,1,blush); R(ctx,ox+10,oy+7,1,1,blush);
      R(ctx,ox+7,oy+7,2,1,mouth);
    } else {
      R(ctx,ox+5,oy+1,6,1,pal.hair);
      R(ctx,ox+4,oy+2,8,6,pal.hair);
      R(ctx,ox+5,oy+2,3,1,hairL);
      R(ctx,ox+4,oy+6,8,2,hairD);
      R(ctx,ox+6,oy+8,4,1,pal.skinD);
    }
  } else {
    // samping (menghadap kiri; kanan = cermin)
    const a=legA<0?-1:0, b=legA>0?1:0;
    if(fx==='flame'){ R(ctx,ox+8,oy+9,5,9,capeD); R(ctx,ox+12,oy+9,1,9,cape); flameHem(ox+8,5,oy+18); }
    R(ctx,ox+8+b,oy+14,3,5,pantsD); R(ctx,ox+7+b,oy+19,4,2,bootD); R(ctx,ox+7+b,oy+20,4,1,sole);
    R(ctx,ox+5+a,oy+14,3,5,pal.pants); R(ctx,ox+5+a,oy+14,1,5,pantsL); R(ctx,ox+5+a,oy+16,2,1,pantsD);
    R(ctx,ox+3+a,oy+19,5,2,pal.boot); R(ctx,ox+3+a,oy+19,5,1,bootL); R(ctx,ox+3+a,oy+20,5,1,sole);
    R(ctx,ox+5,oy+8,6,6,sh);
    R(ctx,ox+5,oy+8,6,1,shL); R(ctx,ox+10,oy+8,1,6,shD); R(ctx,ox+5,oy+13,6,1,shD);
    R(ctx,ox+5,oy+8,2,6,top);                      // kaus dalam di depan (jaket terbuka)
    R(ctx,ox+7,oy+9,1,5,shD);
    if(fx==='night') R(ctx,ox+7,oy+9,1,5,pal.band);
    R(ctx,ox+5,oy+14,6,1,belt); R(ctx,ox+5,oy+14,1,1,buckle);
    if(armsUp){ R(ctx,ox+5,oy-6,3,15,sh); R(ctx,ox+5,oy-6,1,15,shL); R(ctx,ox+5,oy+8,3,1,cuff); R(ctx,ox+5,oy-8,3,2,pal.skin); }
    else { R(ctx,ox+6,oy+9+al,3,5,sh); R(ctx,ox+6,oy+9+al,1,5,shL); R(ctx,ox+6,oy+13+al,3,1,cuff); R(ctx,ox+6,oy+14+al,3,2,pal.skin); R(ctx,ox+8,oy+15+al,1,1,pal.skinD); }
    // kepala
    R(ctx,ox+4,oy+4,5,4,pal.skin);
    R(ctx,ox+3,oy+6,1,1,pal.skin);
    R(ctx,ox+5,oy+1,6,1,pal.hair);
    R(ctx,ox+4,oy+2,8,2,pal.hair);
    R(ctx,ox+4,oy+4,3,1,pal.hair);
    R(ctx,ox+8,oy+4,4,4,pal.hair);
    R(ctx,ox+9,oy+6,3,2,hairD);
    R(ctx,ox+5,oy+2,3,1,hairL);
    R(ctx,ox+8,oy+5,1,2,pal.skinD);
    R(ctx,ox+5,oy+5,1,2,eye);
    R(ctx,ox+4,oy+7,2,1,mouth);
  }
  if (pal.nohat) {
    // tanpa topi: rambut sudah digambar di atas
  } else if (pal.cap) {
    // topi pelaut
    R(ctx, ox + 4, oy, 8, 4, pal.hat);
    R(ctx, ox + 3, oy + 2, 1, 2, pal.hat);
    R(ctx, ox + 12, oy + 2, 1, 2, pal.hat);
    R(ctx, ox + 4, oy + 3, 8, 1, pal.band);
    R(ctx, ox + 5, oy, 3, 1, lighten(pal.hat, 0.3));
    if (dir === 'down') { R(ctx, ox + 7, oy + 1, 2, 2, pal.band); R(ctx, ox + 4, oy + 4, 8, 1, pal.hatD); }
    else if (dir === 'up') { R(ctx, ox + 4, oy + 4, 8, 1, pal.hatD); }
    else { R(ctx, ox + 2, oy + 3, 3, 2, pal.hatD); R(ctx, ox + 3, oy + 3, 2, 1, pal.hat); }
  } else {
    // topi jerami
    R(ctx, ox + 1, oy + 2, 14, 2, pal.hat);
    R(ctx, ox + 1, oy + 4, 14, 1, pal.hatD);
    R(ctx, ox + 4, oy, 8, 3, pal.hat);
    R(ctx, ox + 4, oy + 2, 8, 1, pal.band);
    R(ctx, ox + 5, oy, 3, 1, lighten(pal.hat, 0.35));
  }
  ctx.restore();

  if (rod) drawRodSkin(ctx, rodGeometry(Math.round(x), Math.round(y), dir, rodShake), rodId, pal.skin);
  else if (hold && !armsUp) drawRodSkin(ctx, holdGeometry(Math.round(x), Math.round(y), dir), rodId, pal.skin);
}

// ---------- umpan, riak, percikan ----------
export function drawBobber(ctx: CanvasRenderingContext2D, x: number, y: number, dip: number, rodId = 'default') {
  const X = Math.round(x);
  const Y = Math.round(y + dip);
  const sk = ROD_SKINS[rodId] || ROD_SKINS.default;
  const t = performance.now() / 1000;
  const plain = !rodId || rodId === 'default';
  const acc = sk.accent || sk.ring;

  // bayangan di air
  ctx.fillStyle = 'rgba(0,40,80,0.18)';
  ctx.beginPath();
  ctx.ellipse(X, Y + 2, 4, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // cahaya lembut sesuai skin joran
  if (!plain && sk.glow) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(X, Y - 1, 1, X, Y - 1, 10);
    gr.addColorStop(0, sk.glow + '66');
    gr.addColorStop(1, sk.glow + '00');
    ctx.fillStyle = gr;
    ctx.fillRect(X - 11, Y - 12, 22, 22);
    ctx.restore();
  }

  // umpan kecil menggantung di bawah pelampung (warna ikut skin)
  const bt = Math.sin(t * 4 + X) > 0 ? 1 : 0;
  R(ctx, X, Y + 2, 1, 2, 'rgba(255,255,255,0.55)');
  if (plain) {
    R(ctx, X - 1, Y + 4, 3, 2, '#e89a8a');
    R(ctx, X + 2, Y + 4 + bt, 1, 1, '#c96f5e');
    R(ctx, X - 1, Y + 4, 1, 1, '#ffffff');
  } else {
    R(ctx, X - 2, Y + 4, 4, 2, sk.shaft);
    R(ctx, X - 2, Y + 5, 4, 1, sk.shaftD);
    R(ctx, X + 2, Y + 4 + bt, 1, 2, acc);
    R(ctx, X - 2, Y + 4, 1, 1, '#ffffff');
  }

  // badan pelampung
  if (plain) {
    R(ctx, X - 2, Y - 3, 4, 2, '#e8412f');
    R(ctx, X - 2, Y - 1, 4, 2, '#ffffff');
    R(ctx, X - 1, Y - 4, 2, 1, '#e8412f');
    R(ctx, X - 3, Y - 2, 1, 2, '#9c2a1d');
    R(ctx, X + 2, Y - 2, 1, 2, '#9c2a1d');
  } else {
    R(ctx, X - 2, Y - 3, 4, 2, sk.shaft);
    R(ctx, X - 2, Y - 1, 4, 2, sk.tip);
    R(ctx, X - 1, Y - 4, 2, 1, acc);
    R(ctx, X - 3, Y - 2, 1, 2, sk.shaftD);
    R(ctx, X + 2, Y - 2, 1, 2, sk.shaftD);
    R(ctx, X - 2, Y - 2, 4, 1, acc);
  }

  // efek khas tiap joran (ramai)
  const tw = (i: number, sp = 3) => 0.35 + 0.65 * Math.abs(Math.sin(t * sp + i * 1.7));
  const orbit = (n: number, rx: number, ry: number, col: string, sp = 1.8, cy = -2) => {
    for (let i = 0; i < n; i++) {
      const a = t * sp + (i * Math.PI * 2) / n;
      ctx.globalAlpha = tw(i);
      R(ctx, Math.round(X + Math.cos(a) * rx), Math.round(Y + cy + Math.sin(a) * ry), 1, 1, col);
    }
    ctx.globalAlpha = 1;
  };
  const rise = (n: number, spread: number, h: number, cols: string[], sp = 1.2) => {
    for (let i = 0; i < n; i++) {
      const k = (t * sp + i / n) % 1;
      ctx.globalAlpha = 1 - k;
      R(ctx, Math.round(X - spread + ((i * 7) % (spread * 2 + 1)) + Math.sin(t * 3 + i) * 1.2), Math.round(Y - 4 - k * h), 1, 1, cols[i % cols.length]);
    }
    ctx.globalAlpha = 1;
  };
  // cincin riak bercahaya untuk joran langka
  if (!plain && sk.glow) {
    for (let j = 0; j < 2; j++) {
      const k = (t * (sk.style === 'crystal' ? 1.4 : sk.style === 'tentacle' ? 0.4 : sk.style === 'dragon' ? 1.0 : 0.7) + j * 0.5) % 1;
      ctx.strokeStyle = sk.glow + Math.round((1 - k) * 150).toString(16).padStart(2, '0');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(X + 0.5, Y + 2.5, 4 + k * 10, 1.6 + k * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  switch (sk.style) {
    case 'stripe': rise(3, 4, 6, [acc, sk.tip], 0.9); break;
    case 'weave': rise(3, 4, 6, [acc, '#8a93a8'], 0.9); break;
    case 'shine': {
      for (let j = 0; j < 2; j++) {
        const k = (t * 0.9 + j * 0.7) % 1.4;
        if (k < 1) R(ctx, X - 2 + Math.round(k * 4), Y - 3, 1, 1, '#ffffff');
      }
      orbit(4, 6, 3, '#ffffff', 1.4);
      rise(4, 5, 9, ['#ffffff', sk.glow || '#bcd8ff'], 1.0);
      break;
    }
    case 'gem':
      // koin emas melompat dari air
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.9 + i / 4) % 1;
        ctx.globalAlpha = 1 - k * 0.7;
        const cx0 = Math.round(X - 6 + i * 4);
        const cy0 = Math.round(Y - 2 - Math.sin(k * Math.PI) * 10);
        R(ctx, cx0, cy0, 2, 2, '#ffd24a');
        R(ctx, cx0, cy0, 1, 1, '#fff3b0');
      }
      ctx.globalAlpha = 1;
      orbit(3, 6, 3, '#fff6c8', 1.6);
      break;
    case 'crystal':
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = tw(i, 5);
        const ox = X + (i - 1) * 6;
        const oy = Y - 7 - (i === 1 ? 3 : 0);
        R(ctx, ox - 1, oy, 3, 1, '#ffffff');
        R(ctx, ox, oy - 1, 1, 3, '#ffffff');
      }
      ctx.globalAlpha = 1;
      // petir menyambar di atas pelampung
      if ((t * 1.3) % 1 < 0.15) {
        const off = [1, -2, 2, -1, 1];
        let bx = X;
        let by = Y - 5;
        for (let s2 = 0; s2 < 5; s2++) {
          bx += off[(s2 + Math.floor(t * 9)) % 5];
          by -= 3;
          R(ctx, bx, by, 1, 3, '#ffffff');
          R(ctx, bx + 1, by, 1, 3, '#7df9ff');
        }
      }
      orbit(3, 6, 3, '#a8ecff', 3.2);
      break;
    case 'moon':
      orbit(7, 8, 4, '#fff7c2', 1.8);
      orbit(4, 5, 2, '#ffffff', -2.4, -3);
      rise(5, 5, 11, ['#fff7c2', '#c9bfff'], 0.9);
      break;
    case 'dragon':
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,106,58,' + (0.18 + 0.1 * Math.sin(t * 9)).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(X, Y - 2, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      rise(9, 5, 14, ['#ffd27a', '#ff6a3a', '#ff9a3a'], 1.5);
      orbit(4, 7, 3, '#ffd27a', 2.2);
      break;
    case 'seadragon':
      // percikan air memancar naik-turun + riak biru
      for (let i = 0; i < 6; i++) {
        const k = (t * 1.1 + i / 6) % 1;
        ctx.globalAlpha = 1 - k * 0.6;
        R(ctx, Math.round(X + (i - 2.5) * 2.2), Math.round(Y - 3 - Math.sin(k * Math.PI) * 11), 1, 2, i % 2 ? '#bff3ff' : '#2fd0ff');
      }
      ctx.globalAlpha = 1;
      R(ctx, X - 5, Y + 3, 3, 1, '#bff3ff');
      R(ctx, X + 3, Y + 3, 3, 1, '#bff3ff');
      break;
    case 'tentacle':
      rise(8, 5, 13, ['#f6d6ff', '#b05cff', '#8e44d6'], 1.0);
      orbit(5, 7, 4, '#c58bff', 1.5);
      for (let i = 0; i < 3; i++) {
        const w = Math.sin(t * 4 + i * 2) * 2;
        R(ctx, Math.round(X - 4 + i * 4 + w), Y + 5, 1, 3, '#8e44d6');
        R(ctx, Math.round(X - 4 + i * 4 + w * 1.4), Y + 8, 1, 1, '#c58bff');
      }
      break;
    default:
      break;
  }
}

export function drawRipple(ctx: CanvasRenderingContext2D, x: number, y: number, k: number) {
  ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - k)).toFixed(3) + ')';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), 3 + k * 12, 1.3 + k * 5, 0, 0, Math.PI * 2);
  ctx.stroke();
}

const LINE_FX: Record<string, 1 | 2> = { emas: 1, kristal: 1, bulan: 1, naga: 1, sisik: 2, tentakel: 2 };

export function drawLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, sag: number, rodId = 'default') {
  const cx = (x0 + x1) / 2;
  const cy = Math.max(y0, y1) + sag;
  const lvl = LINE_FX[rodId];
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x0 + 0.5, y0 + 0.5);
    ctx.quadraticCurveTo(cx, cy, x1 + 0.5, y1 + 0.5);
  };
  if (!lvl) {
    ctx.strokeStyle = 'rgba(240,248,255,0.9)';
    ctx.lineWidth = 0.6;
    path();
    ctx.stroke();
    return;
  }
  const sk = ROD_SKINS[rodId] || ROD_SKINS.default;
  const t = performance.now() / 1000;
  const glow = sk.glow || '#ffffff';
  // cahaya di sekitar senar
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = glow + (lvl === 2 ? '66' : '44');
  ctx.lineWidth = lvl === 2 ? 3.4 : 2.6;
  path();
  ctx.stroke();
  ctx.restore();
  // inti senar berwarna
  ctx.strokeStyle = sk.tip;
  ctx.lineWidth = 0.8;
  path();
  ctx.stroke();
  // titik titik cahaya mengalir sepanjang senar
  const bez = (k: number): [number, number] => {
    const u = 1 - k;
    return [u * u * (x0 + 0.5) + 2 * u * k * cx + k * k * (x1 + 0.5), u * u * (y0 + 0.5) + 2 * u * k * cy + k * k * (y1 + 0.5)];
  };
  const n = lvl === 2 ? 12 : 7;
  const cols = sk.style === 'dragon' ? ['#ffd27a', '#ff6a3a'] : sk.style === 'seadragon' ? ['#bff3ff', '#2fd0ff'] : sk.style === 'crystal' ? ['#ffffff', '#7df9ff'] : sk.style === 'gem' ? ['#fff3b0', '#ffd24a'] : sk.style === 'tentacle' ? ['#f6d6ff', '#b05cff'] : ['#fff7c2', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const k = (t * 0.55 + i / n) % 1;
    const [px, py] = bez(k);
    const off = Math.sin(t * 6 + i * 2) * (lvl === 2 ? 1.6 : 1);
    ctx.globalAlpha = Math.sin(k * Math.PI);
    R(ctx, Math.round(px), Math.round(py + off), 1, 1, cols[i % cols.length]);
    if (lvl === 2 && i % 3 === 0) R(ctx, Math.round(px) + 1, Math.round(py + off), 1, 1, cols[(i + 1) % cols.length]);
  }
  ctx.globalAlpha = 1;
  // butir terang yang meluncur dari joran ke umpan
  const kb = (t * 0.9) % 1;
  const [bx, by] = bez(kb);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glow + 'aa';
  ctx.beginPath();
  ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  R(ctx, Math.round(bx), Math.round(by), 1, 1, '#ffffff');
}

export function drawBubbleAlert(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const b = Math.abs(Math.sin(t * 9)) * 2;
  const X = Math.round(x) - 7;
  const Y = Math.round(y - b) - 14;
  R(ctx, X, Y, 14, 14, '#ffffff');
  R(ctx, X + 1, Y - 1, 12, 1, '#ffffff');
  R(ctx, X + 1, Y + 14, 12, 1, '#ffffff');
  R(ctx, X + 5, Y + 15, 4, 2, '#ffffff');
  R(ctx, X + 1, Y + 1, 12, 12, '#15131a');
  R(ctx, X + 6, Y + 3, 2, 5, '#ffffff');
  R(ctx, X + 6, Y + 9, 2, 2, '#e8412f');
}

// bintang emas muncul di umpan saat ikan menggigit
export function drawStarPop(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const s = 1 + Math.sin(t * 10) * 0.12;
  const X = Math.round(x), Y = Math.round(y - Math.abs(Math.sin(t * 7)) * 2);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.fillStyle = '#7a4a05';
  ctx.beginPath();
  for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.2 : 5.4; const an = -Math.PI / 2 + (k * Math.PI) / 5; ctx.lineTo(Math.cos(an) * (r + 0.9), Math.sin(an) * (r + 0.9)); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.2 : 5.4; const an = -Math.PI / 2 + (k * Math.PI) / 5; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---------- efek tangkapan khas tiap joran ----------
export type CatchKind = 'dragon' | 'seadragon' | 'tentacle' | null;
export function rodCatchKind(rodId: string): CatchKind {
  const st = (ROD_SKINS[rodId] || ROD_SKINS.default).style;
  return st === 'dragon' || st === 'seadragon' || st === 'tentacle' ? st : null;
}
/** Warna & jumlah percikan sesuai joran (cipratan air saat gigitan / tarik / tangkap). */
export function rodBurst(rodId: string): { cols: string[]; nm: number; size: number } {
  const sk = ROD_SKINS[rodId];
  if (!rodId || rodId === 'default' || !sk) return { cols: ['#ffffff', '#ffffff', '#bfeaff'], nm: 1, size: 1 };
  const cols = [sk.glow, sk.spark, sk.ring, sk.shaft, sk.tip].filter(Boolean) as string[];
  return { cols, nm: sk.glow ? 1.8 : 1.2, size: sk.style === 'gem' ? 2 : 1 };
}

/** Titik di lintasan lengkung dari air (x0,y0) ke tangan karakter (x1,y1). */
export function dragonPoint(x0: number, y0: number, x1: number, y1: number, u: number): [number, number] {
  const cx = (x0 + x1) / 2;
  const cy = Math.min(y0, y1) - 42;
  const v = 1 - u;
  return [v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1];
}

const DRAGON_COL = {
  dragon: { b: '#d9482b', d: '#7a1d14', l: '#ffe27a', f: '#ff7a3a', eye: '#ffe27a' },
  seadragon: { b: '#1f9bd1', d: '#0d4f7a', l: '#c9f6ff', f: '#6fe3ff', eye: '#ffffff' },
};

function dragonHead(ctx: CanvasRenderingContext2D, hx: number, hy: number, s: 1 | -1, kind: 'dragon' | 'seadragon', open: boolean) {
  const c = DRAGON_COL[kind];
  const M = (dx: number, dy: number, w: number, h: number, col: string) => R(ctx, s > 0 ? hx + dx : hx - dx - w + 1, hy + dy, w, h, col);
  M(-3, -4, 2, 2, c.f); M(-4, -2, 2, 2, c.f); // surai api / sirip
  M(-2, -3, 6, 5, c.b); // kepala
  M(4, -2, 3, 3, c.b); // moncong
  M(-2, 1, 6, 1, c.d);
  if (open) { M(3, 1, 5, 1, '#3a0f1f'); M(5, 1, 1, 1, '#ffffff'); M(7, 1, 1, 1, '#ffffff'); M(3, 2, 4, 1, c.d); } else M(3, 1, 4, 1, c.d);
  M(-2, -6, 1, 3, c.l); M(0, -6, 1, 3, c.l); // tanduk
  M(1, -2, 2, 1, c.eye); // mata
  M(6, -2, 1, 1, c.d); // lubang hidung
}

/** Naga muncul dari air, melengkung ke karakter sambil membawa ikan, lalu memudar. Mengembalikan posisi kepala. */
export function drawDragon(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, k: number, t: number, kind: 'dragon' | 'seadragon'): [number, number] {
  const c = DRAGON_COL[kind];
  const e = 1 - Math.pow(1 - Math.min(1, k), 2);
  const N = 16;
  const gap = 0.055;
  const s: 1 | -1 = x1 >= x0 ? 1 : -1;
  const alpha = k > 0.8 ? Math.max(0, 1 - (k - 0.8) / 0.2) : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = N; i >= 1; i--) {
    const u = e - i * gap;
    if (u < 0) continue;
    const [px, py] = dragonPoint(x0, y0, x1, y1, u);
    const X = Math.round(px);
    const Y = Math.round(py + Math.sin(t * 10 + i * 0.9) * 1.4);
    const sz = Math.max(2, Math.round(5 - i * 0.2));
    const h = Math.floor(sz / 2);
    R(ctx, X - h, Y - h, sz, sz, c.b);
    R(ctx, X - h, Y + sz - h - 1, sz, 1, c.l);
    if (i % 2 === 0) R(ctx, X, Y - h - 1, 1, 1, c.d);
    if (i % 4 === 1) R(ctx, X - h, Y - h, 1, 1, c.f);
  }
  const [hx0, hy0] = dragonPoint(x0, y0, x1, y1, e);
  const hx = Math.round(hx0);
  const hy = Math.round(hy0 + Math.sin(t * 10) * 0.8);
  dragonHead(ctx, hx, hy, s, kind, true);
  ctx.restore();
  return [hx0, hy0];
}

/** Kepala naga mengintip dari air di dekat pelampung saat ikan ditarik. */
export function drawDragonPeek(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, kind: 'dragon' | 'seadragon') {
  const c = DRAGON_COL[kind];
  const bob = Math.sin(t * 3) * 1.5;
  const X = Math.round(x);
  const Y = Math.round(y);
  ctx.save();
  ctx.globalAlpha = 0.92;
  for (let i = 4; i >= 1; i--) {
    const sx = X + Math.round(Math.sin(t * 2.5 + i) * 1.5);
    const sy = Math.round(Y - i * 3 + bob);
    R(ctx, sx - 2, sy - 1, 4, 3, c.b);
    R(ctx, sx - 2, sy + 1, 4, 1, c.l);
    if (i % 2 === 0) R(ctx, sx - 1, sy - 2, 1, 1, c.d);
  }
  dragonHead(ctx, X, Math.round(Y - 16 + bob), -1, kind, Math.sin(t * 4) > 0);
  ctx.restore();
  // cincin air di pangkal leher
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(X + 0.5, Y + 1, 5 + Math.sin(t * 3) * 1, 1.8, 0, 0, Math.PI * 2); ctx.stroke();
}

/** Tiga tentakel ungu menjulur dari air menangkap ikan (Joran Tentakel Laut Dalam). */
export function drawTentacles(ctx: CanvasRenderingContext2D, x0: number, y0: number, fx: number, fy: number, k: number, t: number) {
  const alpha = k > 0.85 ? Math.max(0, 1 - (k - 0.85) / 0.15) : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let j = 0; j < 3; j++) {
    const bx = x0 + (j - 1) * 6;
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const wave = Math.sin(t * 7 + j * 2 + u * 6) * (1 + u * 2.2);
      const X = Math.round(bx + (fx + (j - 1) * 2 - bx) * u + wave);
      const Y = Math.round(y0 + (fy + 3 - y0) * u);
      const th = i < 4 ? 3 : 2;
      R(ctx, X - 1, Y, th, 2, i % 3 === 0 ? '#c58bff' : '#8e44d6');
      if (i % 3 === 1) R(ctx, X + th - 1, Y, 1, 1, '#f6d6ff');
    }
    R(ctx, Math.round(fx + (j - 1) * 2), Math.round(fy + 2), 2, 2, '#f6d6ff');
  }
  ctx.restore();
}

// ---------- ikan ----------
export const FISH_W = 44;
export const FISH_H = 28;
const fishCache = new Map<string, HTMLCanvasElement>();

interface ShapeDef { rx: number; ry: number; tail: number; tailH: number; dorsal: number }
const SHAPES: Record<string, ShapeDef> = {
  oval: { rx: 11, ry: 6, tail: 7, tailH: 6, dorsal: 4 },
  round: { rx: 9, ry: 8, tail: 5, tailH: 5, dorsal: 3 },
  long: { rx: 15, ry: 4, tail: 7, tailH: 5, dorsal: 3 },
  big: { rx: 14, ry: 9, tail: 8, tailH: 7, dorsal: 5 },
  flat: { rx: 13, ry: 9, tail: 0, tailH: 0, dorsal: 0 },
  shark: { rx: 17, ry: 6, tail: 8, tailH: 8, dorsal: 8 },
};

// Ikan gambar tangan (lihat fishArt.ts): isi piksel dari peta karakter, lalu garis tepi otomatis.
function customFish(art: FishArt): HTMLCanvasElement {
  const W = FISH_W;
  const H = FISH_H;
  const at = (x: number, y: number) => (x >= 0 && x < W && y >= 0 && y < H ? art.r[y]?.[x] ?? '.' : '.');
  const out = mk(W, H);
  const c = out.getContext('2d') as CanvasRenderingContext2D;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = at(x, y);
      if (ch !== '.' && art.p[ch]) { c.fillStyle = art.p[ch]; c.fillRect(x, y, 1, 1); continue; }
      if (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.') { c.fillStyle = '#1b2a3b'; c.fillRect(x, y, 1, 1); }
    }
  }
  return out;
}

export function fishSprite(sp: Species): HTMLCanvasElement {
  const hit = fishCache.get(sp.id);
  if (hit) return hit;
  const art = FISH_ART[sp.id];
  if (art) { const cf = customFish(art); fishCache.set(sp.id, cf); return cf; }
  const W = FISH_W;
  const H = FISH_H;
  const g: (string | null)[][] = Array.from({ length: H }, () => Array<string | null>(W).fill(null));
  const put = (x: number, y: number, c: string) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c;
  };
  const get = (x: number, y: number) => (x >= 0 && x < W && y >= 0 && y < H ? g[y][x] : null);
  const sh = SHAPES[sp.shape];
  const cx = 25;
  const cy = 14;
  const rnd = mulberry32(sp.id.length * 997 + sp.id.charCodeAt(0));
  const bodyTop = lighten(sp.body, 0.22);
  const bodyBot = darken(sp.body, 0.12);

  if (sp.shape === 'flat') {
    // pari: badan belah ketupat + ekor tipis
    for (let y = -sh.ry; y <= sh.ry; y++) {
      for (let x = -sh.rx; x <= sh.rx; x++) {
        if (Math.abs(x) / sh.rx + Math.abs(y) / sh.ry <= 1) {
          put(cx + x, cy + y, y > 2 ? sp.belly : y < -4 ? bodyTop : sp.body);
        }
      }
    }
    for (let i = 1; i <= 10; i++) { put(cx - sh.rx - i + 1, cy, sp.fin); if (i < 4) put(cx - sh.rx - i + 1, cy + 1, sp.fin); }
    for (let i = 0; i < 8; i++) put(cx - 4 + i, cy - sh.ry + 1 + (i % 2), sp.fin);
  } else {
    // ekor
    for (let i = 0; i <= sh.tail; i++) {
      const half = Math.round(1 + (sh.tailH - 1) * (i / sh.tail));
      for (let y = -half; y <= half; y++) {
        if (i === sh.tail && Math.abs(y) < 2) continue; // ekor bercabang
        put(cx - sh.rx + 1 - i, cy + y, sp.fin);
      }
    }
    // sirip punggung
    const dw = Math.max(3, Math.round(sh.rx * 0.45));
    for (let x = -dw; x <= dw; x++) {
      const hgt = Math.round(sh.dorsal * (1 - Math.abs(x + 1) / (dw + 1)));
      for (let k = 0; k <= hgt; k++) put(cx + x - 1, cy - sh.ry - k + 1, sp.fin);
    }
    // sirip perut
    for (let x = -1; x <= 2; x++) put(cx + x - 2, cy + sh.ry + (x === 0 || x === 1 ? 2 : 1), sp.fin);
    // badan
    for (let y = -sh.ry; y <= sh.ry; y++) {
      for (let x = -sh.rx; x <= sh.rx; x++) {
        const d = (x * x) / ((sh.rx + 0.5) * (sh.rx + 0.5)) + (y * y) / ((sh.ry + 0.5) * (sh.ry + 0.5));
        if (d > 1) continue;
        let c = sp.body;
        if (y > sh.ry * 0.25) c = sp.belly;
        else if (y < -sh.ry * 0.55) c = bodyTop;
        else if (y > sh.ry * 0.05) c = bodyBot;
        put(cx + x, cy + y, c);
      }
    }
    // sirip dada
    for (let i = 0; i < 4; i++) put(cx + 1 + i, cy + 2 + Math.floor(i / 2), darken(sp.fin, 0.1));
    put(cx + 1, cy + 1, darken(sp.fin, 0.1));
  }

  // pola
  const onBody = (x: number, y: number) => {
    const c = get(x, y);
    return !!c && c !== sp.fin;
  };
  if (sp.pattern === 'stripes') {
    for (const dx of [-6, -2, 2]) {
      for (let y = -sh.ry; y <= 0; y++) if (onBody(cx + dx, cy + y)) put(cx + dx, cy + y, mix(sp.body, sp.accent, 0.7));
    }
  } else if (sp.pattern === 'band') {
    for (let y = -sh.ry; y <= sh.ry; y++) for (const dx of [-2, -1]) if (onBody(cx + dx, cy + y)) put(cx + dx, cy + y, mix(sp.body, sp.accent, 0.75));
  } else if (sp.pattern === 'spots') {
    for (let i = 0; i < 12; i++) {
      const x = cx - sh.rx + 3 + Math.floor(rnd() * (sh.rx * 2 - 6));
      const y = cy - sh.ry + 2 + Math.floor(rnd() * (sh.ry * 1.1));
      if (onBody(x, y) && get(x, y) !== sp.belly) { put(x, y, sp.accent); if (rnd() < 0.4) put(x + 1, y, sp.accent); }
    }
  }

  // ciri khas
  if (sp.id === 'marlin') for (let i = 1; i <= 7; i++) put(cx + sh.rx + i, cy, i < 3 ? '#7e8f9c' : '#5a6b7a');
  if (sp.id === 'lentera') {
    for (let i = 0; i < 6; i++) put(cx + 4 + Math.floor(i * 0.6), cy - sh.ry - i, '#9aa0d6');
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(cx + 8 + dx, cy - sh.ry - 6 + dy, '#7df9ff');
  }
  if (sp.id === 'buntal') for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; put(cx + Math.cos(a) * (sh.rx + 1), cy + Math.sin(a) * (sh.ry + 1), '#a8742e'); }

  // mata & mulut
  const ex = sp.shape === 'flat' ? cx + 6 : cx + sh.rx - 4;
  const ey = sp.shape === 'flat' ? cy - 3 : cy - Math.max(1, Math.round(sh.ry / 3)) - 1;
  put(ex, ey, '#ffffff'); put(ex + 1, ey, '#ffffff'); put(ex, ey + 1, '#ffffff'); put(ex + 1, ey + 1, '#ffffff');
  put(ex + 1, ey + 1, '#1b2432');
  if (sp.shape !== 'flat') put(cx + sh.rx, cy + 1, darken(sp.body, 0.5));

  // garis tepi otomatis
  const out = mk(W, H);
  const c = out.getContext('2d') as CanvasRenderingContext2D;
  const edge = '#1b2a3b';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (g[y][x]) { c.fillStyle = g[y][x] as string; c.fillRect(x, y, 1, 1); continue; }
      if (get(x - 1, y) || get(x + 1, y) || get(x, y - 1) || get(x, y + 1)) { c.fillStyle = edge; c.fillRect(x, y, 1, 1); }
    }
  }
  fishCache.set(sp.id, out);
  return out;
}

const GIANT_SCALE = 10.5; // ikan raksasa: selebar pulau
/** Tinggi (px dunia) ikan pamer di atas kepala, dihitung dari kepala karakter. Ikan raksasa digambar di belakang: 0. */
export function showFishLift(sp: Species, weight: number): number {
  if (sp.giant) return 0;
  const ratio = sizeRatio(sp, weight);
  const scale = Math.min(1.7, 0.5 + 0.8 * ratio + (sp.rarity === 'secret' ? 0.55 : sp.rarity === 'divine' ? 0.45 : sp.rarity === 'legendary' ? 0.3 : sp.rarity === 'epic' ? 0.15 : 0));
  return 7 + FISH_H * scale;
}

export function drawShowFish(ctx: CanvasRenderingContext2D, x: number, y: number, sp: Species, weight: number) {
  const t = performance.now() / 1000;
  const ratio = sizeRatio(sp, weight);
  const scale = sp.giant ? (sp.gs || GIANT_SCALE) + ratio : Math.min(1.7, 0.5 + 0.8 * ratio + (sp.rarity === 'secret' ? 0.55 : sp.rarity === 'divine' ? 0.45 : sp.rarity === 'legendary' ? 0.3 : sp.rarity === 'epic' ? 0.15 : 0));
  const fw = FISH_W * scale;
  const fh = FISH_H * scale;
  const cx = Math.round(x);
  const cy = Math.round(y) - (sp.giant ? 20 + fh * 0.3 : 28 + fh / 2) + Math.sin(t * 3) * (sp.giant ? 2 : 1.2);
  const col = RARITY[sp.rarity].color;
  const fancy = sp.rarity !== 'common' || isXL(sp, weight);
  if (fancy) {
    ctx.save();
    ctx.globalAlpha = 0.22 + 0.1 * Math.sin(t * 3);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(fw, fh) * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawFish(ctx, sp, cx, cy, scale, Math.sin(t * 2.5) * 0.12, false);
  if (fancy) {
    const n = sp.giant ? 12 : sp.rarity === 'secret' ? 9 : sp.rarity === 'divine' ? 7 : sp.rarity === 'legendary' ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = t * 1.4 + (i * Math.PI * 2) / n;
      const sx = Math.round(cx + Math.cos(a) * (fw * 0.55));
      const sy = Math.round(cy + Math.sin(a) * (fh * 0.7));
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6 + i);
      R(ctx, sx, sy - 1, 1, 3, '#ffffff');
      R(ctx, sx - 1, sy, 3, 1, '#ffffff');
    }
    ctx.globalAlpha = 1;
  }
}

export function drawFish(ctx: CanvasRenderingContext2D, sp: Species, x: number, y: number, scale: number, angle = 0, flip = false) {
  const s = fishSprite(sp);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(flip ? -scale : scale, scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(s, -FISH_W / 2, -FISH_H / 2);
  ctx.restore();
}


// ---------- properti taman ----------
function ell(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: string) {
  ctx.fillStyle = col;
  for (let yy = -Math.ceil(ry); yy <= Math.ceil(ry); yy++) {
    for (let xx = -Math.ceil(rx); xx <= Math.ceil(rx); xx++) {
      if ((xx * xx) / (rx * rx) + (yy * yy) / (ry * ry) <= 1) ctx.fillRect(Math.round(cx + xx), Math.round(cy + yy), 1, 1);
    }
  }
}

let fountainBase: HTMLCanvasElement | null = null;
function getFountainBase() {
  if (fountainBase) return fountainBase;
  const c = mk(64, 48);
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  ell(g, 32, 40, 30, 6, 'rgba(0,20,10,0.22)');
  ell(g, 32, 33, 30, 13, '#6f7885');
  ell(g, 32, 31, 30, 13, '#b8c1cc');
  ell(g, 32, 31, 27, 11, '#8f99a6');
  ell(g, 32, 32, 25, 10, '#3fb4e6');
  ell(g, 32, 32, 22, 8, '#58cbf2');
  ell(g, 32, 33, 15, 5, '#6fdaf6');
  // tiang & mangkuk bertingkat
  R(g, 28, 12, 8, 20, '#a9b2bd');
  R(g, 28, 12, 2, 20, '#d0d7df');
  R(g, 34, 12, 2, 20, '#848e9b');
  ell(g, 32, 23, 11, 4, '#7f8996');
  ell(g, 32, 22, 11, 4, '#b8c1cc');
  ell(g, 32, 22, 9, 3, '#58cbf2');
  ell(g, 32, 13, 6, 2.5, '#b8c1cc');
  ell(g, 32, 13, 4.5, 1.6, '#58cbf2');
  R(g, 31, 8, 2, 6, '#a9b2bd');
  fountainBase = c;
  return c;
}
export function drawFountain(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  ctx.drawImage(getFountainBase(), X, Y);
  // riak air
  for (let i = 0; i < 7; i++) {
    const x = X + 10 + ((t * 9 + i * 8.3) % 42);
    const y = Y + 28 + (i % 4) * 2.5;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.25 * Math.sin(t * 3 + i)).toFixed(2) + ')';
    ctx.fillRect(Math.round(x), Math.round(y), 3, 1);
  }
  // pancuran
  for (let k = -2; k <= 2; k++) {
    for (let j = 0; j < 6; j++) {
      const f = (t * 1.3 + j * 0.14 + k * 0.05) % 1;
      const dx = k * f * 7;
      const dy = -2 + f * 9 - Math.sin(f * Math.PI) * 6 + Math.abs(k) * f * 2;
      ctx.fillStyle = f < 0.5 ? '#e8fbff' : '#9fe3fb';
      ctx.fillRect(Math.round(X + 32 + dx), Math.round(Y + 12 + dy), 1, 1);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(X + 31, Y + 7, 2, 1);
}

function benchRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  ell(ctx, X + 24, Y + 15, 23, 3, 'rgba(0,20,10,0.22)');
  R(ctx, X + 3, Y - 8, 3, 18, '#6b4a2a');
  R(ctx, X + 42, Y - 8, 3, 18, '#6b4a2a');
  R(ctx, X + 1, Y - 7, 46, 3, '#cf9d62');
  R(ctx, X + 1, Y - 4, 46, 1, '#9a6c3a');
  R(ctx, X + 1, Y - 3, 46, 3, '#c28c52');
  R(ctx, X + 1, Y, 46, 1, '#9a6c3a');
  R(ctx, X, Y + 3, 48, 3, '#e0b67e');
  R(ctx, X, Y + 3, 48, 1, '#f1d3a3');
  R(ctx, X, Y + 6, 48, 2, '#a97745');
  R(ctx, X + 4, Y + 8, 3, 6, '#6b4a2a');
  R(ctx, X + 41, Y + 8, 3, 6, '#6b4a2a');
}

function tableRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  ell(ctx, X + 16, Y + 15, 15, 3, 'rgba(0,20,10,0.25)');
  R(ctx, X + 8, Y + 8, 3, 7, '#6e3714');
  R(ctx, X + 21, Y + 8, 3, 7, '#6e3714');
  ell(ctx, X + 16, Y + 8, 15, 6.5, '#7a3d16');
  ell(ctx, X + 16, Y + 7, 15, 6.5, '#d6762f');
  ell(ctx, X + 16, Y + 7, 12, 4.5, '#e08a3f');
  R(ctx, X + 8, Y + 4, 5, 1, '#f0a85c');
  // lentera
  R(ctx, X + 14, Y + 5, 4, 2, '#3a2a18');
  R(ctx, X + 14, Y - 2, 4, 7, '#ffd36a');
  R(ctx, X + 15, Y - 1, 1, 4, '#fff1b8');
  R(ctx, X + 13, Y - 3, 6, 1, '#3a2a18');
  R(ctx, X + 15, Y - 5, 2, 2, '#3a2a18');
  R(ctx, X + 14, Y - 2, 4, 1, '#3a2a18');
}

function tableGlow(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(X + 16, Y + 1, 1, X + 16, Y + 1, 22);
  const a = 0.3 + Math.sin(t * 5 + p.v * 8) * 0.05;
  g.addColorStop(0, 'rgba(255,200,90,' + a + ')');
  g.addColorStop(1, 'rgba(255,200,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(X - 8, Y - 24, 48, 48);
  ctx.restore();
}

function stoolRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  ell(ctx, X + 8, Y + 15, 7, 2, 'rgba(0,20,10,0.25)');
  R(ctx, X + 3, Y + 9, 2, 6, '#7a1d1d');
  R(ctx, X + 11, Y + 9, 2, 6, '#7a1d1d');
  ell(ctx, X + 8, Y + 9, 7, 3.5, '#a32020');
  ell(ctx, X + 8, Y + 8, 7, 3.5, '#d93030');
  R(ctx, X + 5, Y + 7, 3, 1, '#f06a6a');
}

function signRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  ell(ctx, X + 8, Y + 15, 6, 2, 'rgba(0,20,10,0.25)');
  R(ctx, X + 7, Y - 8, 3, 23, '#6b4a2a');
  R(ctx, X + 7, Y - 8, 1, 23, '#8a6338');
  R(ctx, X - 4, Y - 7, 14, 6, '#dcb27a');
  R(ctx, X - 6, Y - 6, 2, 4, '#dcb27a');
  R(ctx, X - 4, Y - 7, 14, 1, '#f1d3a3');
  R(ctx, X - 4, Y - 2, 14, 1, '#9a6c3a');
  R(ctx, X - 1, Y - 5, 8, 1, '#7a5230');
  R(ctx, X + 9, Y, 14, 6, '#c8975e');
  R(ctx, X + 23, Y + 1, 2, 4, '#c8975e');
  R(ctx, X + 9, Y, 14, 1, '#e3b87f');
  R(ctx, X + 9, Y + 5, 14, 1, '#8c5f33');
  R(ctx, X + 12, Y + 3, 8, 1, '#7a5230');
}

function bushRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  ell(ctx, X + 8, Y + 14, 9, 2.5, 'rgba(0,20,10,0.25)');
  const blobs: [number, number, number, number][] = [[4, 10, 5, 4.5], [12, 10, 5, 4.5], [8, 7, 6, 5], [8, 11, 7, 4]];
  for (const [bx, by, rx, ry] of blobs) ell(ctx, X + bx, Y + by, rx, ry, '#256f3b');
  for (const [bx, by, rx, ry] of blobs) ell(ctx, X + bx - 0.5, Y + by - 1, rx - 1, ry - 1, '#2f9448');
  ell(ctx, X + 7, Y + 5, 3, 2, '#4cbb62');
  ell(ctx, X + 12, Y + 9, 2, 1.5, '#4cbb62');
  const berries = p.v > 0.55;
  if (berries) { R(ctx, X + 4, Y + 9, 1, 1, '#ff6b6b'); R(ctx, X + 11, Y + 6, 1, 1, '#ff6b6b'); R(ctx, X + 9, Y + 11, 1, 1, '#ff6b6b'); }
}

function npcRaw(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  const x = p.x * TILE + 8;
  const y = p.y * TILE + 15;
  const bob = Math.sin(t * 2 + p.v * 6) > 0.92 ? 1 : 0;
  drawPlayerRaw(ctx, x, y - bob * 0, 'down', false, 0, false, 0, PAL_BAYU);
}


// ---------- toko ----------
const GLYPH: Record<string, string[]> = {
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  O: ['###', '#.#', '#.#', '#.#', '###'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
};
function pixText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, col: string) {
  let cx = x;
  for (const ch of text) {
    const g = GLYPH[ch];
    if (g) g.forEach((row, ry) => { for (let rx = 0; rx < 3; rx++) if (row[rx] === '#') R(ctx, cx + rx, y + ry, 1, 1, col); });
    cx += 4;
  }
}

function shopRaw(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  const X = p.x * TILE;
  const Y = p.y * TILE; // area 64x48
  ell(ctx, X + 32, Y + 46, 31, 3, 'rgba(0,20,10,0.28)');
  // dinding belakang
  R(ctx, X + 3, Y + 14, 58, 26, '#a9743f');
  for (let i = 0; i < 6; i++) R(ctx, X + 3, Y + 16 + i * 4, 58, 1, '#8a5d30');
  R(ctx, X + 3, Y + 14, 2, 28, '#7a5230');
  R(ctx, X + 59, Y + 14, 2, 28, '#7a5230');
  // rak kecil berisi botol umpan
  R(ctx, X + 8, Y + 22, 14, 1, '#5e3b1a');
  R(ctx, X + 10, Y + 18, 3, 4, '#8fd3f0');
  R(ctx, X + 15, Y + 19, 3, 3, '#e9856b');
  R(ctx, X + 42, Y + 22, 14, 1, '#5e3b1a');
  R(ctx, X + 44, Y + 18, 3, 4, '#f5c451');
  R(ctx, X + 49, Y + 19, 3, 3, '#7dd87a');
  // penjual di balik meja
  drawPlayerRaw(ctx, X + 32, Y + 34, 'down', false, 0, false, 0, PAL_BAYU);
  // meja
  R(ctx, X + 4, Y + 33, 56, 9, '#8b5a2b');
  R(ctx, X + 4, Y + 33, 56, 2, '#d9a066');
  R(ctx, X + 4, Y + 41, 56, 1, '#5e3b1a');
  for (const lx of [8, 20, 32, 44, 56]) R(ctx, X + lx, Y + 36, 1, 5, '#6f4624');
  // barang di atas meja: stoples umpan, ikan di piring, koin
  R(ctx, X + 8, Y + 29, 6, 4, '#8fd3f0');
  R(ctx, X + 8, Y + 28, 6, 1, '#d6f0fb');
  R(ctx, X + 9, Y + 30, 4, 2, '#e9856b');
  R(ctx, X + 18, Y + 30, 7, 3, '#cfd8dc');
  R(ctx, X + 24, Y + 29, 2, 2, '#cfd8dc');
  R(ctx, X + 44, Y + 30, 3, 3, '#f5c451');
  R(ctx, X + 48, Y + 31, 3, 2, '#f5c451');
  // joran bersandar
  R(ctx, X + 56, Y + 15, 1, 25, '#6b4a2a');
  R(ctx, X + 55, Y + 15, 1, 3, '#d9d6cf');
  // tenda belang merah-putih
  for (let i = 0; i < 8; i++) {
    const col = i % 2 ? '#f5ecd9' : '#d8453b';
    R(ctx, X + i * 8, Y + 6, 8, 11, col);
    R(ctx, X + i * 8 + 1, Y + 17, 6, 2, col);
    R(ctx, X + i * 8 + 2, Y + 19, 4, 1, col);
  }
  R(ctx, X + 2, Y + 2, 60, 2, '#a83a31');
  R(ctx, X, Y + 4, 64, 3, '#8a2f27');
  R(ctx, X, Y + 6, 64, 1, '#e8756a');
  // papan nama
  R(ctx, X + 24, Y + 3, 1, 4, '#5a3a1c');
  R(ctx, X + 39, Y + 3, 1, 4, '#5a3a1c');
  R(ctx, X + 20, Y - 8, 24, 11, '#5a3a1c');
  R(ctx, X + 21, Y - 7, 22, 9, '#e9c28a');
  pixText(ctx, 'TOKO', X + 24, Y - 5, '#5a3a1c');
  // lentera kedip
  R(ctx, X + 1, Y + 20, 3, 4, Math.sin(t * 6) > 0 ? '#ffd86b' : '#ffc23d');
}


// ---------- warung & hiasan ----------
const STALL_COL = [
  { a: '#e8693a', b: '#fff1dd', c: '#b6491f' },   // warung ikan bakar
  { a: '#2fb3b0', b: '#f2fbfa', c: '#1b827f' },   // toko umpan
  { a: '#9a5fd1', b: '#ffe9a8', c: '#6f3da3' },   // toko hiasan
  { a: '#4fb85a', b: '#f3ffe9', c: '#2f8a3b' },   // kedai kelapa
];

function stallBack(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE; // area 48x32
  const v = Math.floor(p.v) % 4;
  ell(ctx, X + 24, Y + 30, 23, 3, 'rgba(0,20,10,0.28)');
  // tiang dan dinding belakang
  R(ctx, X + 3, Y + 10, 42, 16, '#b98450');
  for (let i = 0; i < 4; i++) R(ctx, X + 3, Y + 12 + i * 4, 42, 1, '#946437');
  R(ctx, X + 2, Y + 8, 2, 20, '#6f4624');
  R(ctx, X + 44, Y + 8, 2, 20, '#6f4624');
  // penjual
  drawPlayerRaw(ctx, X + 24, Y + 23, 'down', false, 0, false, 0, PAL_BAYU);
  // barang khas tiap warung (bagian yang diam)
  if (v === 0) {
    R(ctx, X + 8, Y + 19, 12, 5, '#2b2b2b'); R(ctx, X + 9, Y + 19, 10, 1, '#ff8a3a');
    for (let i = 0; i < 3; i++) R(ctx, X + 9 + i * 4, Y + 17, 2, 2, '#e9a36b');
  } else if (v === 1) {
    R(ctx, X + 7, Y + 17, 5, 6, '#8fd3f0'); R(ctx, X + 7, Y + 16, 5, 1, '#d6f0fb'); R(ctx, X + 8, Y + 20, 3, 2, '#e9856b');
    R(ctx, X + 14, Y + 18, 5, 5, '#f4b3c8'); R(ctx, X + 15, Y + 21, 3, 1, '#c95d86');
    R(ctx, X + 36, Y + 18, 6, 5, '#c9a26a'); R(ctx, X + 36, Y + 17, 6, 1, '#6b4a2a');
  } else if (v === 3) {
    for (let i = 0; i < 4; i++) { R(ctx, X + 8 + i * 4, Y + 19, 4, 4, '#6b4423'); R(ctx, X + 9 + i * 4, Y + 19, 2, 1, '#b6865a'); }
    R(ctx, X + 11, Y + 15, 4, 4, '#6b4423'); R(ctx, X + 12, Y + 15, 2, 1, '#b6865a');
    R(ctx, X + 36, Y + 17, 1, 6, '#e9d27a'); R(ctx, X + 38, Y + 17, 1, 6, '#e9d27a'); R(ctx, X + 40, Y + 17, 1, 6, '#e9d27a');
  }
}

// bagian yang bergerak: uap warung ikan bakar & lampion goyang (digambar langsung, cuma beberapa kotak kecil)
function stallAnim(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  const v = Math.floor(p.v) % 4;
  if (v === 0) {
    for (let i = 0; i < 3; i++) { const k = (t * 1.3 + i * 0.7) % 1; R(ctx, X + 11 + i * 3 + Math.round(Math.sin(k * 6) * 1), Y + 15 - Math.round(k * 9), 2, 2, `rgba(220,220,220,${(0.7 - k * 0.6).toFixed(2)})`); }
  } else if (v === 2) {
    for (let i = 0; i < 4; i++) {
      const sw = Math.round(Math.sin(t * 2 + i) * 1);
      R(ctx, X + 8 + i * 9 + sw, Y + 11, 1, 3, '#5e3b1a');
      R(ctx, X + 6 + i * 9 + sw, Y + 14, 5, 5, i % 2 ? '#ffd24a' : '#ff6a4a');
      R(ctx, X + 7 + i * 9 + sw, Y + 15, 3, 3, '#fff0a0');
    }
  }
}

function stallFront(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  const v = Math.floor(p.v) % 4;
  const col = STALL_COL[v];
  // meja
  R(ctx, X + 2, Y + 22, 44, 7, '#8b5a2b');
  R(ctx, X + 2, Y + 22, 44, 2, '#d9a066');
  R(ctx, X + 2, Y + 28, 44, 1, '#5e3b1a');
  // barang di atas meja
  if (v === 0) { R(ctx, X + 30, Y + 20, 8, 3, '#cfd8dc'); R(ctx, X + 32, Y + 19, 4, 1, '#e9a36b'); }
  if (v === 1) { R(ctx, X + 28, Y + 20, 7, 2, '#cfd8dc'); }
  if (v === 2) { R(ctx, X + 30, Y + 20, 4, 2, '#f4c7a8'); R(ctx, X + 36, Y + 19, 4, 3, '#f7a8c4'); }
  if (v === 3) { R(ctx, X + 30, Y + 19, 4, 3, '#f5ecd9'); R(ctx, X + 36, Y + 19, 4, 3, '#f5ecd9'); }
  // tenda belang
  for (let i = 0; i < 6; i++) {
    const c = i % 2 ? col.b : col.a;
    R(ctx, X + i * 8, Y + 2, 8, 8, c);
    R(ctx, X + i * 8 + 1, Y + 10, 6, 2, c);
    R(ctx, X + i * 8 + 2, Y + 12, 4, 1, c);
  }
  R(ctx, X + 1, Y, 46, 2, col.c);
  R(ctx, X, Y + 2, 48, 1, col.a);
}

export function drawStall(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  const v = Math.floor(p.v) % 4;
  if (ART_FX.bake) {
    const [back, front] = bakeLayers('stall' + v, [96, 80, 16, 16], p, [(c, q) => stallBack(c, q), (c, q) => stallFront(c, q)], true);
    blit(ctx, p, back);
    stallAnim(ctx, p, t);
    blit(ctx, p, front);
  } else {
    stallBack(ctx, p); stallAnim(ctx, p, t); stallFront(ctx, p);
  }
  // lentera kecil (kedip)
  R(ctx, X + 1, Y + 13, 2, 3, Math.sin(t * 5 + p.v * 9) > 0 ? '#ffd86b' : '#ffc23d');
}

function flowersRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  const pal = [['#ff7aa8', '#ffd1e0'], ['#ffd84a', '#fff3b0'], ['#ffffff', '#e5e5f5'], ['#b58bff', '#e0ccff']][Math.floor(p.v * 4) % 4];
  for (let i = 0; i < 5; i++) {
    const fx = X + 2 + ((i * 7 + Math.floor(p.v * 13)) % 12);
    const fy = Y + 5 + ((i * 5 + Math.floor(p.v * 7)) % 8);
    R(ctx, fx, fy + 2, 1, 3, '#2f7a3a');
    R(ctx, fx - 1, fy, 3, 1, pal[0]); R(ctx, fx, fy - 1, 1, 3, pal[0]); R(ctx, fx, fy, 1, 1, pal[1]);
  }
}

function barrelRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  ell(ctx, X + 8, Y + 14, 6, 2, 'rgba(0,0,0,0.25)');
  R(ctx, X + 3, Y + 4, 10, 10, '#9a6a3a');
  R(ctx, X + 4, Y + 3, 8, 1, '#b98450');
  R(ctx, X + 3, Y + 6, 10, 1, '#4a3320'); R(ctx, X + 3, Y + 11, 10, 1, '#4a3320');
  R(ctx, X + 5, Y + 4, 1, 10, '#b98450'); R(ctx, X + 9, Y + 4, 1, 10, '#7a512a');
}

function crateRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  ell(ctx, X + 8, Y + 14, 7, 2, 'rgba(0,0,0,0.25)');
  R(ctx, X + 2, Y + 4, 12, 10, '#b98450');
  R(ctx, X + 2, Y + 4, 12, 1, '#d9a066');
  R(ctx, X + 2, Y + 13, 12, 1, '#6f4624');
  R(ctx, X + 2, Y + 4, 1, 10, '#6f4624'); R(ctx, X + 13, Y + 4, 1, 10, '#6f4624');
  for (let i = 0; i < 8; i++) { R(ctx, X + 3 + i, Y + 5 + i, 1, 1, '#8a5d30'); R(ctx, X + 12 - i, Y + 5 + i, 1, 1, '#8a5d30'); }
  if (p.v > 0.5) R(ctx, X + 5, Y + 2, 6, 2, '#7ad4e8'); // ikan di atas peti
}

export function drawNet(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  const X = p.x * TILE;
  const Y = p.y * TILE; // 32x16
  R(ctx, X + 1, Y + 1, 2, 15, '#6b4a2a'); R(ctx, X + 29, Y + 1, 2, 15, '#6b4a2a');
  R(ctx, X, Y + 1, 32, 2, '#8a5d30');
  const sway = Math.round(Math.sin(t * 1.4 + p.v * 5));
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 9; j++) if ((i + j) % 2 === 0) R(ctx, X + 4 + i * 2, Y + 3 + j + (j > 5 ? sway : 0), 1, 1, '#d7c9a0');
  }
  R(ctx, X + 6, Y + 11, 2, 2, '#f08a4a'); R(ctx, X + 16, Y + 12, 2, 2, '#f08a4a'); R(ctx, X + 24, Y + 11, 2, 2, '#f08a4a');
}

function umbrellaRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  const cols = [['#ff5a5a', '#ffffff'], ['#3aa8ff', '#ffffff'], ['#ffc83a', '#ffffff']][Math.floor(p.v * 3) % 3];
  ell(ctx, X + 8, Y + 14, 8, 2, 'rgba(0,0,0,0.2)');
  R(ctx, X + 7, Y + 2, 2, 12, '#6b4a2a');
  for (let i = 0; i < 8; i++) R(ctx, X + i * 2, Y - 2 + Math.round(Math.abs(i - 3.5) * 0.6), 2, 5, i % 2 ? cols[1] : cols[0]);
  R(ctx, X + 1, Y + 11, 6, 3, cols[0]); R(ctx, X + 1, Y + 12, 6, 1, cols[1]); // handuk
}

export function drawBoat(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  const X = p.x * TILE;
  const Y = p.y * TILE + Math.round(Math.sin(t * 1.3 + p.v * 8) * 1);
  ell(ctx, X + 16, Y + 14, 14, 3, 'rgba(0,40,70,0.25)');
  R(ctx, X + 3, Y + 6, 26, 6, '#a8693a');
  R(ctx, X + 1, Y + 5, 4, 3, '#a8693a'); R(ctx, X + 27, Y + 5, 4, 3, '#a8693a');
  R(ctx, X + 3, Y + 6, 26, 1, '#d9a066');
  R(ctx, X + 4, Y + 9, 24, 1, '#f5ecd9');
  R(ctx, X + 4, Y + 12, 24, 1, '#6f4624');
  R(ctx, X + 15, Y - 5, 1, 11, '#6b4a2a');
  R(ctx, X + 16, Y - 4, 7, 6, '#f5ecd9'); R(ctx, X + 16, Y + 1, 7, 1, '#e8d9b8');
}

// ---------- ikan raksasa (setengah lebar pulau) ----------
let _giantFish: HTMLCanvasElement | null = null;
const KOI_BLOBS: [number, number, number, number, string][] = [
  [118, -14, 28, 11, '#fff4e4'], [172, -8, 17, 9, '#fff4e4'], [78, -9, 15, 7, '#fff4e4'],
  [146, -24, 13, 6, '#2b2224'], [96, -20, 10, 5, '#2b2224'], [204, -22, 9, 5, '#2b2224'], [64, -4, 7, 4, '#2b2224'],
];
function giantFishBody(): HTMLCanvasElement {
  if (_giantFish) return _giantFish;
  const W = 256;
  const H = 96;
  const c = mk(W, H);
  const g = c.getContext('2d')!;
  const mid = 50;
  const halfAt = (x: number) => {
    const u = x / W;
    if (u < 0.2) return 0;
    const t = (u - 0.2) / 0.8;
    const k = t < 0.58 ? (t - 0.58) / 0.58 : (t - 0.58) / 0.42;
    return 40 * Math.sqrt(Math.max(0, 1 - k * k));
  };
  for (let x = 0; x < W; x++) {
    const hh = Math.round(halfAt(x));
    if (hh <= 0) continue;
    for (let dy = -hh; dy <= hh; dy++) {
      const f = (dy + hh) / (2 * hh);
      let col = f < 0.18 ? '#d9441f' : f < 0.5 ? '#f47a2c' : f < 0.78 ? '#ffb347' : '#ffe9c4';
      // bercak koi putih dan hitam (bentuk lonjong, bukan garis)
      for (const [bx, by, brx, bry, bc] of KOI_BLOBS) {
        const ex = (x - bx) / brx;
        const ey = (dy - by) / bry;
        if (ex * ex + ey * ey < 1 && f < 0.7) col = bc;
      }
      g.fillStyle = col;
      g.fillRect(x, mid + dy, 1, 1);
    }
    // garis tepi
    g.fillStyle = '#7a2a12';
    g.fillRect(x, mid - hh - 1, 1, 1);
    g.fillRect(x, mid + hh + 1, 1, 1);
  }
  // sisik
  g.fillStyle = 'rgba(255,255,255,0.22)';
  for (let row = -4; row <= 4; row++) {
    for (let x = 70 + (row & 1) * 5; x < 220; x += 10) {
      const hh = halfAt(x);
      if (Math.abs(row * 8) < hh - 3) { g.fillRect(x, mid + row * 8, 4, 1); g.fillRect(x - 1, mid + row * 8 + 1, 1, 2); g.fillRect(x + 4, mid + row * 8 + 1, 1, 2); }
    }
  }
  // sirip punggung
  g.fillStyle = '#ff9a3c';
  for (let x = 95; x < 175; x++) { const h = Math.round(18 * Math.sin(((x - 95) / 80) * Math.PI) * (1 - (x - 95) / 160)); g.fillRect(x, mid - halfAt(x) - 1 - h, 1, h + 1); }
  g.fillStyle = '#ffd08a';
  for (let x = 100; x < 165; x += 6) g.fillRect(x, mid - halfAt(x) - 8, 1, 7);
  // sirip dada dan perut
  g.fillStyle = '#ff9a3c';
  for (let i = 0; i < 20; i++) g.fillRect(168 + i, mid + 6 + Math.round(i * 0.9), 1, 8 - Math.floor(i / 4));
  for (let i = 0; i < 16; i++) g.fillRect(120 + i, mid + halfAt(120 + i) - 2, 1, 6 + Math.floor(i / 3));
  // insang dan mulut
  g.fillStyle = '#b8431a';
  for (let dy = -22; dy <= 22; dy++) g.fillRect(190 + Math.round(Math.abs(dy) * 0.12), mid + dy, 1, 1);
  g.fillRect(246, mid + 8, 8, 2); g.fillRect(250, mid + 9, 4, 2);
  g.fillStyle = '#ffd24a'; g.fillRect(250, mid + 3, 3, 3); // kumis
  // mata
  g.fillStyle = '#fff'; g.fillRect(216, mid - 14, 14, 14);
  g.fillRect(218, mid - 16, 10, 2); g.fillRect(218, mid, 10, 2);
  g.fillStyle = '#ffcf3a'; g.fillRect(220, mid - 11, 8, 8);
  g.fillStyle = '#1b1210'; g.fillRect(222, mid - 9, 5, 5);
  g.fillStyle = '#fff'; g.fillRect(223, mid - 9, 2, 2);
  _giantFish = c;
  return c;
}

export function drawGiantFish(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  const body = giantFishBody();
  const X = p.x * TILE + Math.round(Math.sin(t * 0.35) * 6);
  const Y = p.y * TILE + Math.round(Math.sin(t * 0.8) * 2);
  // bayangan di air
  ctx.fillStyle = 'rgba(0,30,70,0.28)';
  ctx.beginPath(); ctx.ellipse(X + 128, Y + 70, 122, 20, 0, 0, Math.PI * 2); ctx.fill();
  // ekor dengan ayunan
  const sw = Math.sin(t * 2.2) * 8;
  ctx.fillStyle = '#ff8a3a';
  ctx.beginPath();
  ctx.moveTo(X + 52, Y + 50);
  ctx.lineTo(X + 4 - sw * 0.4, Y + 6 + sw);
  ctx.lineTo(X + 26, Y + 40 + sw * 0.4);
  ctx.lineTo(X + 2 + sw * 0.4, Y + 92 + sw);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffc77a';
  ctx.beginPath();
  ctx.moveTo(X + 48, Y + 50); ctx.lineTo(X + 12 - sw * 0.4, Y + 20 + sw); ctx.lineTo(X + 30, Y + 46 + sw * 0.3);
  ctx.closePath(); ctx.fill();
  ctx.drawImage(body, X, Y);
  // gelembung dan riak
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.5 + i * 0.27) % 1;
    ctx.fillStyle = `rgba(255,255,255,${(0.6 - k * 0.55).toFixed(2)})`;
    ctx.fillRect(X + 244 + i * 3, Y + 20 - Math.round(k * 28), 2, 2);
  }
}

// ---------- warna karakter pemain lain (konsisten per akun) ----------
function shadeHex(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
export function palForId(id: string): Pal {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  h >>>= 0;
  const hairs = ['#9a68d8', '#2a2a35', '#c8793a', '#e8c15a', '#d9d6cf', '#4aa3d8', '#d85a8a', '#4a8a4a'];
  const shirts = ['#2f4b7e', '#8a3a3a', '#3f7a5a', '#6a4a8a', '#b8782a', '#2f7a8a', '#5a5a66', '#a8456a'];
  const skins: [string, string][] = [['#f6d4b8', '#dcae8c'], ['#e2b48a', '#c4936a'], ['#c68e62', '#a8714a'], ['#8d5b3a', '#6e4328']];
  const hair = hairs[h % hairs.length];
  const shirt = shirts[(h >>> 4) % shirts.length];
  const skin = skins[(h >>> 9) % skins.length];
  return { ...PAL_PLAYER, nohat: true, top: ['#f3e8d0', '#ffffff', '#f6e3a8', '#e8f0e0'][(h >>> 14) % 4], boot: '#6b4a2a', skin: skin[0], skinD: skin[1], hair, shirt, shirtD: shadeHex(shirt, -0.3), pants: shadeHex(shirt, -0.45), hat: shadeHex(shirt, -0.12), hatD: shadeHex(shirt, -0.38) };
}

// ---------- pembungkus: gambar dari cache ----------
export function drawBench(ctx: CanvasRenderingContext2D, p: Prop) { drawBaked(ctx, p, 'bench', [80, 64, 16, 32], benchRaw); }
export function drawStool(ctx: CanvasRenderingContext2D, p: Prop) { drawBaked(ctx, p, 'stool', [48, 64, 16, 32], stoolRaw); }
export function drawSign(ctx: CanvasRenderingContext2D, p: Prop) { drawBaked(ctx, p, 'sign', [64, 64, 16, 32], signRaw); }
export function drawBush(ctx: CanvasRenderingContext2D, p: Prop) { drawBaked(ctx, p, p.v > 0.55 ? 'bushB' : 'bush', [48, 64, 16, 32], bushRaw); }
export function drawFlowers(ctx: CanvasRenderingContext2D, p: Prop) { drawBaked(ctx, p, 'flowers' + p.v.toFixed(3), [48, 48, 16, 16], flowersRaw, false); }
export function drawBarrel(ctx: CanvasRenderingContext2D, p: Prop) { drawBaked(ctx, p, 'barrel', [48, 64, 16, 32], barrelRaw); }
export function drawCrate(ctx: CanvasRenderingContext2D, p: Prop) { drawBaked(ctx, p, p.v > 0.5 ? 'crateF' : 'crate', [48, 64, 16, 32], crateRaw); }
export function drawUmbrella(ctx: CanvasRenderingContext2D, p: Prop) { drawBaked(ctx, p, 'umb' + (Math.floor(p.v * 3) % 3), [48, 64, 16, 32], umbrellaRaw); }
export function drawRock(ctx: CanvasRenderingContext2D, p: Prop) { drawBaked(ctx, p, p.v > 0.5 ? 'rockB' : 'rock', [48, 64, 16, 32], rockRaw); }
export function drawNpc(ctx: CanvasRenderingContext2D, p: Prop, t: number) { drawBaked(ctx, p, 'npc', [64, 96, 16, 48], (c, q) => npcRaw(c, q, t)); }
export function drawShop(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  if (!ART_FX.bake) { shopRaw(ctx, p, t); return; }
  blit(ctx, p, bakeLayers('shop', [96, 96, 16, 32], p, [(c, q) => shopRaw(c, q, 0)], true)[0]);
  // lentera kedip (digambar langsung di atas hasil cache)
  R(ctx, p.x * TILE + 1, p.y * TILE + 20, 3, 4, Math.sin(t * 6) > 0 ? '#ffd86b' : '#ffc23d');
}
export function drawTable(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  drawBaked(ctx, p, 'table', [64, 64, 16, 32], tableRaw);
  tableGlow(ctx, p, t);
}


// ---------- properti baru untuk pulau besar: pinus, mercusuar, pohon raksasa ----------
function discR(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string) {
  for (let yy = -r; yy <= r; yy++) {
    const w = Math.floor(Math.sqrt(r * r - yy * yy + 0.5));
    R(ctx, cx - w, cy + yy, w * 2 + 1, 1, col);
  }
}

function pineRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const bx = p.x * TILE + 8;
  const by = p.y * TILE + 15;
  drawShadow(ctx, bx + 1, by, 7, 2.5);
  R(ctx, bx - 1, by - 5, 3, 5, '#6b4423');
  R(ctx, bx - 1, by - 5, 1, 5, '#8a5a2e');
  const dark = p.v > 0.5 ? '#1f5a3a' : '#22603a';
  const light = p.v > 0.5 ? '#35874f' : '#3a8c52';
  for (let k = 0; k < 4; k++) {
    const bottom = by - 4 - k * 7;
    const hw = 8 - k * 1.5;
    for (let r = 0; r < 10; r++) {
      const w = Math.max(0, Math.round(hw * (r + 1) / 10));
      const y = bottom - 10 + r;
      R(ctx, bx - w, y, w * 2 + 1, 1, dark);
      R(ctx, bx - w, y, Math.max(1, Math.ceil(w * 0.9)), 1, light);
    }
  }
  R(ctx, bx - 2, by - 31, 1, 1, '#7fc08a');
}
export function drawPine(ctx: CanvasRenderingContext2D, p: Prop) { drawBaked(ctx, p, p.v > 0.5 ? 'pineA' : 'pineB', [48, 64, 16, 48], pineRaw); }

function lighthouseRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE; // 32x32 alas
  const cx = X + 16;
  const gy = Y + 29;
  drawShadow(ctx, cx + 2, gy, 15, 4, 0.3);
  // batu karang di dasar
  R(ctx, cx - 13, gy - 6, 26, 6, '#7d838d');
  R(ctx, cx - 11, gy - 9, 22, 4, '#a3a9b2');
  R(ctx, cx - 13, gy - 3, 26, 3, '#656b75');
  const top = gy - 94;
  const bot = gy - 9;
  for (let y = top; y < bot; y++) {
    const f = (y - top) / (bot - top);
    const hw = Math.round(5 + f * 3);
    const red = Math.floor((y - top) / 12) % 2 === 0;
    R(ctx, cx - hw, y, hw * 2, 1, red ? '#e24a35' : '#f6f1e4');
    R(ctx, cx + hw - 3, y, 3, 1, red ? '#b83422' : '#d4cdbb');
    R(ctx, cx - hw, y, 2, 1, red ? '#f06a52' : '#ffffff');
  }
  R(ctx, cx - 2, bot - 9, 4, 9, '#5a3a22');
  R(ctx, cx - 1, bot - 8, 2, 1, '#8a5a2e');
  R(ctx, cx - 1, top + 28, 2, 4, '#2b3a55');
  R(ctx, cx - 1, top + 52, 2, 4, '#2b3a55');
  // balkon + ruang lampu
  R(ctx, cx - 10, top - 2, 20, 3, '#3a3f4a');
  R(ctx, cx - 10, top - 3, 20, 1, '#7b8290');
  for (let i = 0; i < 5; i++) R(ctx, cx - 9 + i * 4, top - 7, 1, 5, '#3a3f4a');
  R(ctx, cx - 6, top - 14, 12, 12, '#ffe58a');
  R(ctx, cx - 6, top - 14, 12, 1, '#3a3f4a');
  R(ctx, cx - 1, top - 14, 2, 12, '#3a3f4a');
  R(ctx, cx - 5, top - 13, 3, 3, '#fff6c8');
  for (let r = 0; r < 7; r++) R(ctx, cx - 7 + r, top - 21 + r, 14 - r * 2, 1, r < 6 ? '#c8322a' : '#e24a35');
  R(ctx, cx - 1, top - 24, 2, 3, '#3a3f4a');
}
export function drawLighthouse(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  blit(ctx, p, bakeLayers('lighthouse', [64, 192, 16, 144], p, [lighthouseRaw], true)[0]);
  const X = p.x * TILE + 16;
  const Y = p.y * TILE + 29 - 94 - 8;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const a = 0.32 + 0.1 * Math.sin(t * 3);
  const g = ctx.createRadialGradient(X, Y, 1, X, Y, 34);
  g.addColorStop(0, 'rgba(255,225,130,' + a + ')');
  g.addColorStop(1, 'rgba(255,225,130,0)');
  ctx.fillStyle = g;
  ctx.fillRect(X - 36, Y - 36, 72, 72);
  ctx.restore();
}

function bigTreeRaw(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE; // 64x48 alas
  const cx = X + 32;
  const gy = Y + 42;
  drawShadow(ctx, cx + 3, gy, 28, 6, 0.26);
  R(ctx, cx - 7, gy - 28, 14, 28, '#7a4a21');
  R(ctx, cx - 7, gy - 28, 3, 28, '#98602d');
  R(ctx, cx + 4, gy - 28, 3, 28, '#5d3a18');
  R(ctx, cx - 11, gy - 4, 22, 4, '#7a4a21');
  const top = gy - 52;
  const blobs: [number, number, number][] = [[-26, 8, 14], [26, 8, 14], [0, -8, 19], [-15, -9, 14], [15, -9, 14], [-31, 18, 10], [31, 18, 10], [0, 12, 16], [-14, 14, 13], [14, 14, 13]];
  for (const [dx, dy, r] of blobs) discR(ctx, cx + dx, top + dy, r, '#2c7a3a');
  for (const [dx, dy, r] of blobs) discR(ctx, cx + dx, top + dy - 1, r - 1, '#3f9f4a');
  for (const [dx, dy, r] of blobs) discR(ctx, cx + dx - 1, top + dy - 3, Math.max(2, r - 4), '#62c45a');
  for (let i = 0; i < 14; i++) R(ctx, cx - 36 + ((i * 11 + 5) % 72), top - 10 + ((i * 7) % 40), 3, 1, '#2c7a3a');
  for (let i = 0; i < 9; i++) {
    const fx = cx - 30 + ((i * 13 + 3) % 60);
    const fy = top - 6 + ((i * 9) % 38);
    R(ctx, fx, fy, 2, 2, i % 2 ? '#e8483c' : '#f59a2a');
  }
}
export function drawBigTree(ctx: CanvasRenderingContext2D, p: Prop) { drawBaked(ctx, p, 'bigtree', [160, 160, 48, 112], bigTreeRaw); }

// ---------- karakter dengan garis tepi ----------
// Digambar dulu ke kanvas sementara, lalu ditempel 4x bergeser (bayangan gelap) dan sekali lagi normal = garis tepi 1 piksel.
let pScratch: HTMLCanvasElement | null = null;
let pOutline: HTMLCanvasElement | null = null;
const PS_W = 80, PS_H = 80, PS_AX = 40, PS_AY = 60;
export function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Dir, moving: boolean, step: number, rod: boolean, rodShake = 0, pal: Pal = PAL_PLAYER, rodId = 'default', hold = false, armsUp = false) {
  if (!ART_FX.outline) { drawPlayerRaw(ctx, x, y, dir, moving, step, rod, rodShake, pal, rodId, hold, armsUp); return; }
  if (!pScratch) { pScratch = mk(PS_W, PS_H); pOutline = mk(PS_W, PS_H); }
  const sc = pScratch.getContext('2d') as CanvasRenderingContext2D;
  const oc = (pOutline as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D;
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.clearRect(0, 0, PS_W, PS_H);
  sc.imageSmoothingEnabled = false;
  const rx = Math.round(x), ry = Math.round(y);
  drawPlayerRaw(sc, PS_AX + (x - rx), PS_AY + (y - ry), dir, moving, step, rod, rodShake, pal, rodId, hold, armsUp);
  oc.globalCompositeOperation = 'source-over';
  oc.clearRect(0, 0, PS_W, PS_H);
  oc.drawImage(pScratch, -1, 0); oc.drawImage(pScratch, 1, 0); oc.drawImage(pScratch, 0, -1); oc.drawImage(pScratch, 0, 1);
  oc.globalCompositeOperation = 'source-in';
  oc.fillStyle = '#14110f';
  oc.fillRect(0, 0, PS_W, PS_H);
  oc.globalCompositeOperation = 'source-over';
  const dx = rx - PS_AX, dy = ry - PS_AY;
  ctx.drawImage(pOutline as HTMLCanvasElement, dx, dy);
  ctx.drawImage(pScratch, dx, dy);
}
