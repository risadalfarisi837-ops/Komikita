// Semua gambar game Mancing dibuat lewat kode (pixel art procedural), tanpa file gambar.
import { RARITY, isXL, sizeRatio } from '@/lib/fishing';
import type { Species } from '@/lib/fishing';

export const TILE = 16;
export type Dir = 'down' | 'up' | 'left' | 'right';
export type Tile = 'deep' | 'shallow' | 'sand' | 'grass' | 'plank' | 'dirt';
export type PropKind = 'palm' | 'rock' | 'lamp' | 'fountain' | 'bench' | 'table' | 'stool' | 'sign' | 'bush' | 'npc' | 'shop' | 'stall' | 'flowers' | 'barrel' | 'crate' | 'net' | 'umbrella' | 'boat' | 'giantfish';
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

// ---------- dunia ----------
export const MAP_W = 36;
export const MAP_H = 40; // lebih tinggi: ada dek pamer dan ikan raksasa di selatan pulau
const WATER_COLORS = ['#6fd0ea', '#5cc2e4', '#4cb1dc', '#3c9fd3', '#2f88c5', '#2872b4'];

export function generateWorld(seed = 11): World {
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
        tiles[y][x] = beach ? 'sand' : (dw[y][x] >= 3 && vnoise(x / 4.2, y / 4.2) > 0.6 ? 'grass' : 'sand');
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
  putBlock('fountain', [[sx - 1, sy - 9], [sx - 3, sy - 9], [sx + 1, sy - 8], [sx - 5, sy - 9], [sx - 2, sy - 10], [sx - 7, sy - 9]], 4, 3);
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
        const pp = dw[y][x] >= 3 ? 0.07 : 0.1;
        if (!neighOcc && rnd() < pp) place('palm', x, y);
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
  renderTerrain(world, dl, pond, pierTiles, seed);
  return world;
}

function renderTerrain(world: World, dl: number[][], pond: boolean[][], pier: [number, number][], seed: number) {
  const ctx = world.terrain.getContext('2d') as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  const { w, h, tiles } = world;
  const isLand = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && (tiles[y][x] === 'sand' || tiles[y][x] === 'grass');
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const rnd = mulberry32(seed * 7919 + ty * 131 + tx * 17);
      const X = tx * TILE;
      const Y = ty * TILE;
      const t = tiles[ty][tx];
      if (t === 'grass') {
        R(ctx, X, Y, TILE, TILE, '#5fae5b');
        for (let i = 0; i < 7; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, '#4c9a4f');
        for (let i = 0; i < 5; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, '#7bc66d');
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
      } else if (t === 'sand') {
        R(ctx, X, Y, TILE, TILE, '#e8d194');
        for (let i = 0; i < 7; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, '#d8bd7c');
        for (let i = 0; i < 4; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, '#f4e3ae');
        if (rnd() < 0.05) { R(ctx, X + 5, Y + 7, 2, 1, '#fff'); R(ctx, X + 6, Y + 8, 1, 1, '#f1b6c8'); }
      } else if (t === 'dirt') {
        R(ctx, X, Y, TILE, TILE, '#b48a5c');
        for (let i = 0; i < 9; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, '#9b7248');
        for (let i = 0; i < 6; i++) R(ctx, X + rnd() * 15, Y + rnd() * 15, 1, 1, '#c9a274');
        if (rnd() < 0.35) { const qx = X + 2 + Math.floor(rnd() * 11); const qy = Y + 2 + Math.floor(rnd() * 11); R(ctx, qx, qy, 2, 1, '#d8c7a6'); R(ctx, qx, qy + 1, 2, 1, '#8c6a43'); }
        const isDirt = (ax: number, ay: number) => ax >= 0 && ay >= 0 && ax < w && ay < h && tiles[ay][ax] === 'dirt';
        if (!isDirt(tx, ty - 1)) { R(ctx, X, Y, TILE, 1, '#cfa876'); R(ctx, X, Y + 1, TILE, 1, '#a07a4d'); }
        if (!isDirt(tx, ty + 1)) { R(ctx, X, Y + TILE - 2, TILE, 1, '#8f6c44'); R(ctx, X, Y + TILE - 1, TILE, 1, '#7c5b36'); }
        if (!isDirt(tx - 1, ty)) R(ctx, X, Y, 1, TILE, '#a07a4d');
        if (!isDirt(tx + 1, ty)) R(ctx, X + TILE - 1, Y, 1, TILE, '#8f6c44');
      } else {
        const d = Math.min(5, Math.max(0, dl[ty][tx] - 1));
        R(ctx, X, Y, TILE, TILE, WATER_COLORS[d]);
        if (pond[ty][tx]) {
          R(ctx, X, Y, TILE, TILE, '#5fc9d6');
          if (rnd() < 0.14) {
            const lx = X + 3 + Math.floor(rnd() * 8);
            const ly = Y + 4 + Math.floor(rnd() * 7);
            R(ctx, lx, ly, 4, 3, '#3f9d55'); R(ctx, lx + 1, ly - 1, 2, 1, '#3f9d55'); R(ctx, lx + 3, ly + 1, 1, 1, '#5fc9d6');
            if (rnd() < 0.5) R(ctx, lx + 1, ly, 1, 1, '#ffb7d5');
          }
        }
        // buih di tepi pantai
        const f = 'rgba(240,252,255,0.85)';
        if (isLand(tx, ty - 1)) for (let i = 0; i < TILE; i += 1) if ((i + tx) % 5 !== 0) R(ctx, X + i, Y, 1, i % 3 === 0 ? 2 : 1, f);
        if (isLand(tx, ty + 1)) for (let i = 0; i < TILE; i += 1) if ((i + tx) % 4 !== 0) R(ctx, X + i, Y + TILE - 1, 1, 1, f);
        if (isLand(tx - 1, ty)) for (let i = 0; i < TILE; i += 1) if ((i + ty) % 5 !== 0) R(ctx, X, Y + i, i % 3 === 0 ? 2 : 1, 1, f);
        if (isLand(tx + 1, ty)) for (let i = 0; i < TILE; i += 1) if ((i + ty) % 4 !== 0) R(ctx, X + TILE - 1, Y + i, 1, 1, f);
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

export function drawPalm(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
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

export function drawRock(ctx: CanvasRenderingContext2D, p: Prop) {
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
export interface RodSkin { shaft: string; shaftD: string; grip: string; tip: string; ring: string; glow?: string; spark?: string }
export const ROD_SKINS: Record<string, RodSkin> = {
  default: { shaft: '#8a5a2b', shaftD: '#5e3a18', grip: '#3d2610', tip: '#e8d9b0', ring: '#b88a4a' },
  fiber: { shaft: '#3fb7a6', shaftD: '#26857a', grip: '#1f4a45', tip: '#d8fff6', ring: '#8ff0df' },
  karbon: { shaft: '#2b2f3a', shaftD: '#14171f', grip: '#c0392b', tip: '#ff6b5e', ring: '#5a6073' },
  perak: { shaft: '#c9d3df', shaftD: '#8c99ab', grip: '#3e5a8a', tip: '#ffffff', ring: '#eaf2ff', glow: '#bcd8ff' },
  emas: { shaft: '#f2c230', shaftD: '#b8860b', grip: '#6b3f12', tip: '#fff3b0', ring: '#ffe27a', glow: '#ffd24a', spark: '#fff6c8' },
  kristal: { shaft: '#58d6ff', shaftD: '#2b8fc9', grip: '#2a3f7a', tip: '#e6fbff', ring: '#a8ecff', glow: '#7df9ff', spark: '#ffffff' },
  bulan: { shaft: '#d9d2ff', shaftD: '#8f86d6', grip: '#3a2f78', tip: '#fffbe0', ring: '#f0ecff', glow: '#c9bfff', spark: '#fff7c2' },
  naga: { shaft: '#c0392b', shaftD: '#7a1d14', grip: '#1f3b2a', tip: '#ffcf5a', ring: '#ffa14a', glow: '#ff6a3a', spark: '#ffd27a' },
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
  line(ctx, g.hx, g.hy, g.tx, g.ty, sk.shaftD, 2);
  line(ctx, g.hx, g.hy, g.tx, g.ty, sk.shaft, 1);
  line(ctx, g.hx, g.hy, g.hx + dx * 0.28, g.hy + dy * 0.28, sk.grip, 2);
  R(ctx, g.hx + dx * 0.5, g.hy + dy * 0.5, 2, 2, sk.ring);
  R(ctx, g.hx + dx * 0.74, g.hy + dy * 0.74, 2, 2, sk.ring);
  R(ctx, g.tx, g.ty, 2, 2, sk.tip);
  if (sk.glow) {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 4);
    ctx.fillStyle = sk.glow;
    ctx.beginPath();
    ctx.arc(g.tx + 1, g.ty + 1, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (sk.spark) {
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

export interface Pal { skin: string; skinD: string; hair: string; shirt: string; shirtD: string; pants: string; boot: string; hat: string; hatD: string; band: string; cap?: boolean }
export const PAL_PLAYER: Pal = { skin: '#f6d4b8', skinD: '#dcae8c', hair: '#9a68d8', shirt: '#2f4b7e', shirtD: '#1f3459', pants: '#223559', boot: '#2a2233', hat: '#2b4375', hatD: '#1b2c52', band: '#f0c75a', cap: true };
export const PAL_BAYU: Pal = { skin: '#e2b48a', skinD: '#c4936a', hair: '#d9d6cf', shirt: '#6b9a4e', shirtD: '#527a3a', pants: '#c8a96a', boot: '#6b4a2a', hat: '#ead69a', hatD: '#c9b06a', band: '#8a5a2b' };

export function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Dir, moving: boolean, step: number, rod: boolean, rodShake = 0, pal: Pal = PAL_PLAYER, rodId = 'default', hold = false, armsUp = false) {
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
  const legA = moving ? (fr === 1 ? -1 : fr === 3 ? 1 : 0) : 0;
  if (dir === 'down' || dir === 'up') {
    R(ctx, ox + 5, oy + 16 + (legA < 0 ? -1 : 0), 2, 4, pal.pants);
    R(ctx, ox + 9, oy + 16 + (legA > 0 ? -1 : 0), 2, 4, pal.pants);
    R(ctx, ox + 4, oy + 19 + (legA < 0 ? -1 : 0), 3, 2, pal.boot);
    R(ctx, ox + 9, oy + 19 + (legA > 0 ? -1 : 0), 3, 2, pal.boot);
    R(ctx, ox + 4, oy + 10, 8, 7, pal.shirt);
    R(ctx, ox + 4, oy + 15, 8, 2, pal.shirtD);
    if (dir === 'up') R(ctx, ox + 5, oy + 11, 6, 5, '#8a5a2b');
    if (armsUp) {
      R(ctx, ox + 2, oy - 6, 2, 17, pal.shirt);
      R(ctx, ox + 12, oy - 6, 2, 17, pal.shirt);
      R(ctx, ox + 2, oy - 8, 2, 2, pal.skin);
      R(ctx, ox + 12, oy - 8, 2, 2, pal.skin);
    } else {
      R(ctx, ox + 2, oy + 11, 2, 5, pal.shirt);
      R(ctx, ox + 12, oy + 11, 2, 5, pal.shirt);
      R(ctx, ox + 2, oy + 16, 2, 1, pal.skin);
      R(ctx, ox + 12, oy + 16, 2, 1, pal.skin);
    }
    R(ctx, ox + 4, oy + 3, 8, 8, dir === 'up' ? pal.hair : pal.skin);
    if (dir === 'down') {
      R(ctx, ox + 4, oy + 3, 8, 2, pal.hair);
      R(ctx, ox + 3, oy + 4, 1, 4, pal.hair);
      R(ctx, ox + 12, oy + 4, 1, 4, pal.hair);
      R(ctx, ox + 6, oy + 7, 1, 2, '#1d1d2b');
      R(ctx, ox + 9, oy + 7, 1, 2, '#1d1d2b');
      R(ctx, ox + 5, oy + 9, 2, 1, 'rgba(240,110,120,0.55)');
      R(ctx, ox + 9, oy + 9, 2, 1, 'rgba(240,110,120,0.55)');
      R(ctx, ox + 7, oy + 10, 2, 1, '#b5543f');
    } else {
      R(ctx, ox + 3, oy + 4, 1, 5, pal.hair);
      R(ctx, ox + 12, oy + 4, 1, 5, pal.hair);
    }
  } else {
    // samping (menghadap kiri; kanan = cermin)
    R(ctx, ox + 6 + (legA < 0 ? -1 : 0), oy + 16, 2, 4, pal.pants);
    R(ctx, ox + 8 + (legA > 0 ? 1 : 0), oy + 16, 2, 4, darken(pal.pants, 0.15));
    R(ctx, ox + 4 + (legA < 0 ? -1 : 0), oy + 19, 4, 2, pal.boot);
    R(ctx, ox + 8 + (legA > 0 ? 1 : 0), oy + 19, 4, 2, darken(pal.boot, 0.15));
    R(ctx, ox + 5, oy + 10, 6, 7, pal.shirt);
    R(ctx, ox + 5, oy + 15, 6, 2, pal.shirtD);
    R(ctx, ox + 9, oy + 11, 3, 5, '#8a5a2b');
    R(ctx, ox + 4, oy + 3, 8, 8, pal.skin);
    R(ctx, ox + 8, oy + 3, 4, 8, pal.hair);
    R(ctx, ox + 4, oy + 3, 5, 2, pal.hair);
    R(ctx, ox + 5, oy + 7, 1, 2, '#1d1d2b');
    R(ctx, ox + 3, oy + 8, 1, 1, pal.skinD);
    R(ctx, ox + 4, oy + 9, 2, 1, 'rgba(240,110,120,0.55)');
    R(ctx, ox + 4, oy + 10, 2, 1, '#b5543f');
    if (armsUp) {
      R(ctx, ox + 5, oy - 6, 3, 17, lighten(pal.shirt, 0.1));
      R(ctx, ox + 5, oy - 8, 3, 2, pal.skin);
    } else {
      R(ctx, ox + 5, oy + 11, 3, 5, lighten(pal.shirt, 0.1));
      R(ctx, ox + 5, oy + 16, 2, 1, pal.skin);
    }
  }
  if (pal.cap) {
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
export function drawBobber(ctx: CanvasRenderingContext2D, x: number, y: number, dip: number) {
  const X = Math.round(x);
  const Y = Math.round(y + dip);
  ctx.fillStyle = 'rgba(0,40,80,0.18)';
  ctx.beginPath();
  ctx.ellipse(X, Y + 2, 4, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  R(ctx, X - 2, Y - 3, 4, 2, '#e8412f');
  R(ctx, X - 2, Y - 1, 4, 2, '#ffffff');
  R(ctx, X - 1, Y - 4, 2, 1, '#e8412f');
  R(ctx, X - 3, Y - 2, 1, 2, '#9c2a1d');
  R(ctx, X + 2, Y - 2, 1, 2, '#9c2a1d');
}

export function drawRipple(ctx: CanvasRenderingContext2D, x: number, y: number, k: number) {
  ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - k)).toFixed(3) + ')';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), 3 + k * 12, 1.3 + k * 5, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, sag: number) {
  const cx = (x0 + x1) / 2;
  const cy = Math.max(y0, y1) + sag;
  ctx.strokeStyle = 'rgba(240,248,255,0.9)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x0 + 0.5, y0 + 0.5);
  ctx.quadraticCurveTo(cx, cy, x1 + 0.5, y1 + 0.5);
  ctx.stroke();
}

export function drawBubbleAlert(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const b = Math.abs(Math.sin(t * 9)) * 2;
  const X = Math.round(x) - 6;
  const Y = Math.round(y - b) - 12;
  R(ctx, X, Y, 12, 12, '#ffffff');
  R(ctx, X + 1, Y - 1, 10, 1, '#ffffff');
  R(ctx, X + 1, Y + 12, 10, 1, '#ffffff');
  R(ctx, X + 4, Y + 13, 4, 2, '#ffffff');
  R(ctx, X + 5, Y + 15, 2, 1, '#ffffff');
  R(ctx, X + 5, Y + 2, 2, 6, '#e8412f');
  R(ctx, X + 5, Y + 9, 2, 2, '#e8412f');
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

export function fishSprite(sp: Species): HTMLCanvasElement {
  const hit = fishCache.get(sp.id);
  if (hit) return hit;
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
export function drawShowFish(ctx: CanvasRenderingContext2D, x: number, y: number, sp: Species, weight: number) {
  const t = performance.now() / 1000;
  const ratio = sizeRatio(sp, weight);
  const scale = sp.giant ? (sp.gs || GIANT_SCALE) + ratio : Math.min(1.7, 0.5 + 0.8 * ratio + (sp.rarity === 'legendary' ? 0.3 : sp.rarity === 'epic' ? 0.15 : 0));
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
    const n = sp.giant ? 12 : sp.rarity === 'legendary' ? 5 : 3;
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

export function drawBench(ctx: CanvasRenderingContext2D, p: Prop) {
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

export function drawTable(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
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

export function drawStool(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  ell(ctx, X + 8, Y + 15, 7, 2, 'rgba(0,20,10,0.25)');
  R(ctx, X + 3, Y + 9, 2, 6, '#7a1d1d');
  R(ctx, X + 11, Y + 9, 2, 6, '#7a1d1d');
  ell(ctx, X + 8, Y + 9, 7, 3.5, '#a32020');
  ell(ctx, X + 8, Y + 8, 7, 3.5, '#d93030');
  R(ctx, X + 5, Y + 7, 3, 1, '#f06a6a');
}

export function drawSign(ctx: CanvasRenderingContext2D, p: Prop) {
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

export function drawBush(ctx: CanvasRenderingContext2D, p: Prop) {
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

export function drawNpc(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  const x = p.x * TILE + 8;
  const y = p.y * TILE + 15;
  const bob = Math.sin(t * 2 + p.v * 6) > 0.92 ? 1 : 0;
  drawPlayer(ctx, x, y - bob * 0, 'down', false, 0, false, 0, PAL_BAYU);
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

export function drawShop(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
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
  drawPlayer(ctx, X + 32, Y + 34, 'down', false, 0, false, 0, PAL_BAYU);
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

export function drawStall(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  const X = p.x * TILE;
  const Y = p.y * TILE; // area 48x32
  const v = Math.floor(p.v) % 4;
  const col = STALL_COL[v];
  ell(ctx, X + 24, Y + 30, 23, 3, 'rgba(0,20,10,0.28)');
  // tiang dan dinding belakang
  R(ctx, X + 3, Y + 10, 42, 16, '#b98450');
  for (let i = 0; i < 4; i++) R(ctx, X + 3, Y + 12 + i * 4, 42, 1, '#946437');
  R(ctx, X + 2, Y + 8, 2, 20, '#6f4624');
  R(ctx, X + 44, Y + 8, 2, 20, '#6f4624');
  // penjual
  drawPlayer(ctx, X + 24, Y + 23, 'down', false, 0, false, 0, PAL_BAYU);
  // barang khas tiap warung (di belakang meja)
  if (v === 0) {
    R(ctx, X + 8, Y + 19, 12, 5, '#2b2b2b'); R(ctx, X + 9, Y + 19, 10, 1, '#ff8a3a');
    for (let i = 0; i < 3; i++) R(ctx, X + 9 + i * 4, Y + 17, 2, 2, '#e9a36b');
    for (let i = 0; i < 3; i++) { const k = (t * 1.3 + i * 0.7) % 1; R(ctx, X + 11 + i * 3 + Math.round(Math.sin(k * 6) * 1), Y + 15 - Math.round(k * 9), 2, 2, `rgba(220,220,220,${(0.7 - k * 0.6).toFixed(2)})`); }
  } else if (v === 1) {
    R(ctx, X + 7, Y + 17, 5, 6, '#8fd3f0'); R(ctx, X + 7, Y + 16, 5, 1, '#d6f0fb'); R(ctx, X + 8, Y + 20, 3, 2, '#e9856b');
    R(ctx, X + 14, Y + 18, 5, 5, '#f4b3c8'); R(ctx, X + 15, Y + 21, 3, 1, '#c95d86');
    R(ctx, X + 36, Y + 18, 6, 5, '#c9a26a'); R(ctx, X + 36, Y + 17, 6, 1, '#6b4a2a');
  } else if (v === 2) {
    for (let i = 0; i < 4; i++) {
      const sw = Math.round(Math.sin(t * 2 + i) * 1);
      R(ctx, X + 8 + i * 9 + sw, Y + 11, 1, 3, '#5e3b1a');
      R(ctx, X + 6 + i * 9 + sw, Y + 14, 5, 5, i % 2 ? '#ffd24a' : '#ff6a4a');
      R(ctx, X + 7 + i * 9 + sw, Y + 15, 3, 3, '#fff0a0');
    }
  } else {
    for (let i = 0; i < 4; i++) { R(ctx, X + 8 + i * 4, Y + 19, 4, 4, '#6b4423'); R(ctx, X + 9 + i * 4, Y + 19, 2, 1, '#b6865a'); }
    R(ctx, X + 11, Y + 15, 4, 4, '#6b4423'); R(ctx, X + 12, Y + 15, 2, 1, '#b6865a');
    R(ctx, X + 36, Y + 17, 1, 6, '#e9d27a'); R(ctx, X + 38, Y + 17, 1, 6, '#e9d27a'); R(ctx, X + 40, Y + 17, 1, 6, '#e9d27a');
  }
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
  // lentera kecil
  R(ctx, X + 1, Y + 13, 2, 3, Math.sin(t * 5 + p.v * 9) > 0 ? '#ffd86b' : '#ffc23d');
}

export function drawFlowers(ctx: CanvasRenderingContext2D, p: Prop) {
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

export function drawBarrel(ctx: CanvasRenderingContext2D, p: Prop) {
  const X = p.x * TILE;
  const Y = p.y * TILE;
  ell(ctx, X + 8, Y + 14, 6, 2, 'rgba(0,0,0,0.25)');
  R(ctx, X + 3, Y + 4, 10, 10, '#9a6a3a');
  R(ctx, X + 4, Y + 3, 8, 1, '#b98450');
  R(ctx, X + 3, Y + 6, 10, 1, '#4a3320'); R(ctx, X + 3, Y + 11, 10, 1, '#4a3320');
  R(ctx, X + 5, Y + 4, 1, 10, '#b98450'); R(ctx, X + 9, Y + 4, 1, 10, '#7a512a');
}

export function drawCrate(ctx: CanvasRenderingContext2D, p: Prop) {
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

export function drawUmbrella(ctx: CanvasRenderingContext2D, p: Prop) {
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
  return { ...PAL_PLAYER, skin: skin[0], skinD: skin[1], hair, shirt, shirtD: shadeHex(shirt, -0.3), pants: shadeHex(shirt, -0.45), hat: shadeHex(shirt, -0.12), hatD: shadeHex(shirt, -0.38) };
}
