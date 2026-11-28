// Mesin game Mancing (tanpa React): gerak, lempar joran, tunggu gigitan, mini-game menarik ikan, dan render.
import { RARITY, SPECIES, SPECIES_BY_ID, rollFish, rollGiant, rollShark, withSize } from '@/lib/fishing';
import type { NetPose, RemotePlayer } from '@/lib/fishingNet';
import type { Rarity, SizeTier, Species } from '@/lib/fishing';
import {
  TILE, generateWorld, drawPlayer, drawPalm, drawRock, drawLamp, drawBobber, drawRipple, drawLine,
  drawBubbleAlert, drawStarPop, drawFish, drawShowFish, rodGeometry, PAL_PLAYER, drawFountain, drawBench, drawTable, drawStool, drawSign, drawBush, drawNpc,
  drawStall, drawFlowers, drawPine, drawLighthouse, drawBigTree, drawBarrel, drawCrate, drawNet, drawUmbrella, drawBoat, drawGiantFish, drawShop, palForId, mulberry32,
} from './art';
import type { Dir, Pal, World } from './art';
import { palFromCode, palFromOutfit } from './outfit';
import type { Outfit } from './outfit';

export type Phase = 'idle' | 'cast' | 'wait' | 'bite' | 'reel' | 'catching' | 'result';
export interface Catch { species: Species; weight: number }
export interface Profile { name: string; title: string; level: number; rodName: string; rodId?: string; outfit?: Outfit }
export interface ShoalStatus { dist: number; ang: number; left: number; kind: 'ikan' | 'hiu' | 'raksasa' }
export interface EngineStatus { shoal: ShoalStatus | null; inShoal: boolean }
interface Shoal { x: number; y: number; r: number; until: number; kind: 'ikan' | 'hiu' | 'raksasa' }
const TIPS = [
  'Tahan tombol supaya zona hijau ngikutin ikan.',
  'Ada gerombolan ikan? Mancing di situ, peluang ikan langka naik drastis!',
  'Ikan XL itu yang paling besar di jenisnya. Pamerin, yuk!',
  'Joran yang lebih bagus bikin ikan langka lebih sering nyangkut.',
  'Tas penuh? Jual dulu ikannya biar bisa mancing lagi.',
];
export interface EngineEvents {
  onPhase?: (p: Phase) => void;
  onCatch?: (c: Catch) => void;
  onToast?: (m: string) => void;
  onBite?: () => void;
  onAuto?: (on: boolean) => void; // Mode Developer: auto fishing menyala / mati
  onNearShop?: (near: boolean) => void; // pemain dekat Toko Mancing (satu-satunya toko fungsional)
}

const DIRV: Record<Dir, { x: number; y: number }> = { down: { x: 0, y: 1 }, up: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const isWater = (t: string) => t === 'deep' || t === 'shallow';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string }
interface Ripple { x: number; y: number; t: number }
interface Target { tx: number; ty: number; wx: number; wy: number }
interface Reel { fishPos: number; fishTarget: number; tNext: number; zone: number; zoneV: number; zoneH: number; prog: number; time: number; diff: number }

export class FishingEngine {
  readonly world: World;
  phase: Phase = 'idle';
  level = 1;
  luck = 0;
  bagFull = false;
  profile: Profile = { name: '', title: '', level: 1, rodName: '' };
  private shoal: Shoal | null = null;
  private nextShoal = 12;
  private castInShoal = false;
  private castKind: 'ikan' | 'hiu' | 'raksasa' = 'ikan';
  private waterSpots: [number, number][] | null = null;
  private shoalForced = false; // gerombolan dari Dev Tools (bukan jadwal bersama)
  private shoalId = -1;
  private clockOffset = 0;      // selisih jam server (ms)
  private remotes = new Map<string, { p: RemotePlayer; rx: number; ry: number; step: number; moving: boolean; pal: Pal }>();
  private bubbles = new Map<string, { text: string; until: number }>();

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ev: EngineEvents;

  private px = 0;
  private py = 0;
  private dir: Dir = 'right';
  private moving = false;
  private stepT = 0;
  private joyX = 0;
  private joyY = 0;
  private keys = new Set<string>();

  private cssW = 360;
  private cssH = 640;
  private dpr = 1;
  private S = 4;
  private baseS = 4; // skala dasar dari ukuran layar
  private zoom = 1; // pengali zoom dari pemain (pinch / tombol +/-)
  private camX = 0;
  private camY = 0;
  private time = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private vignette: CanvasGradient | null = null;

  private target: Target | null = null;
  private castT = 0;
  // lempar berjarak: tahan tombol Joran, lepas saat bar di Normal / Sedang / Jauh
  private charging = false;
  private charge = 0;
  private chargeDir = 1;
  private castTier = 0;
  private tierLuck() { return [0, 0.1, 0.25][this.castTier] || 0; }
  private waitT = 0;
  private biteT = 0;
  private fish: Catch | null = null;
  private holding = false;
  private reel: Reel = { fishPos: 50, fishTarget: 50, tNext: 0, zone: 30, zoneV: 0, zoneH: 28, prog: 30, time: 0, diff: 1 };
  private catchT = 0;
  private reelRip = 0;
  private nearShopNow = false;
  private ripples: Ripple[] = [];
  private parts: Particle[] = [];

  constructor(canvas: HTMLCanvasElement, ev: EngineEvents = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.ev = ev;
    this.world = generateWorld();
    this.px = (this.world.start.x + 0.5) * TILE;
    this.py = (this.world.start.y + 1) * TILE - 3;
    this.dir = 'right';
  }

  // ---------- kontrol dari UI ----------
  setLevel(n: number) { this.level = n; }
  setLuck(n: number) { this.luck = n; }
  // 0..1 dari kekuatan joran: makin bagus joran, makin lebar zona hijau & makin lambat ikan melawan
  private ease = 0;
  setEase(n: number) { this.ease = Math.min(1, Math.max(0, n)); }
  private rodPower = 0; // kekuatan joran: Divine & Secret hanya keluar kalau >= DIVINE_MIN_POWER
  setRodPower(n: number) { this.rodPower = n; }
  setBagFull(b: boolean) { this.bagFull = b; }
  private pal: Pal = PAL_PLAYER; // gaya karakter sendiri (dari Lemari)
  setProfile(p: Profile) { this.profile = p; this.pal = p.outfit ? palFromOutfit(p.outfit) : PAL_PLAYER; }

  // ---------- mabar ----------
  setClockOffset(ms: number) { this.clockOffset = ms; }
  setRemotes(list: RemotePlayer[]) {
    const seen = new Set<string>();
    for (const p of list) {
      seen.add(p.id);
      const cur = this.remotes.get(p.id);
      const pal = palFromCode(p.o) || palForId(p.id); // gaya dari Lemari pemain itu; kalau belum ada, acak dari id
      if (cur) { cur.p = p; cur.pal = pal; }
      else this.remotes.set(p.id, { p, rx: p.x ?? 0, ry: p.y ?? 0, step: 0, moving: !!p.moving, pal });
    }
    for (const id of Array.from(this.remotes.keys())) if (!seen.has(id)) this.remotes.delete(id);
  }
  /** Gelembung chat di atas kepala. id = uid pemain, atau 'me' untuk karakter sendiri. */
  setBubble(id: string, text: string, seconds = 6) {
    this.bubbles.set(id, { text: text.slice(0, 80), until: performance.now() / 1000 + seconds });
  }
  netPose(): NetPose {
    const ph = this.phase;
    const casting = ph === 'cast' || ph === 'wait' || ph === 'bite' || ph === 'reel' || ph === 'catching';
    const tg = this.target;
    const held = ph === 'idle' && this.held ? { s: this.held.species.id, w: this.held.weight } : null;
    return { x: this.px, y: this.py, dir: this.dir, moving: this.moving, casting, bx: tg ? tg.wx : 0, by: tg ? tg.wy : 0, held };
  }
  held: Catch | null = null; // ikan yang sedang dipegang untuk dipamerkan
  setHeld(c: Catch | null) { this.held = c; }
  setMove(x: number, y: number) { this.joyX = x; this.joyY = y; }
  key(code: string, down: boolean) { if (down) this.keys.add(code); else this.keys.delete(code); }

  action(down: boolean) {
    if (this.phase === 'reel') { this.holding = down; return; }
    if (this.phase === 'idle') {
      if (down) { if (!this.charging) { this.charging = true; this.charge = 0; this.chargeDir = 1; } }
      else if (this.charging) { this.charging = false; this.tryCast(this.charge < 0.34 ? 0 : this.charge < 0.67 ? 1 : 2); }
      return;
    }
    if (!down) return;
    if (this.phase === 'cast' || this.phase === 'wait') { this.cancel(); return; } // tombol "Angkat"
    if (this.phase === 'bite') this.hook();
  }

  cancel() {
    if (this.phase === 'cast' || this.phase === 'wait' || this.phase === 'bite') {
      this.target = null;
      this.fish = null;
      this.setPhase('idle');
      this.ev.onToast?.('Dibatalkan');
    }
  }

  resume() {
    if (this.phase === 'result') {
      this.target = null;
      this.fish = null;
      this.setPhase('idle');
    }
  }

  teleport(tx: number, ty: number, dir: Dir) {
    this.px = (tx + 0.5) * TILE;
    this.py = (ty + 1) * TILE - 3;
    this.dir = dir;
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    const base = Math.min(cssW, cssH) * dpr;
    this.baseS = Math.max(3, base / 128);
    this.S = this.calcScale();
    const c = this.ctx;
    const g = c.createRadialGradient(this.canvas.width / 2, this.canvas.height / 2, Math.min(this.canvas.width, this.canvas.height) * 0.35, this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) * 0.75);
    g.addColorStop(0, 'rgba(0,10,30,0)');
    g.addColorStop(1, 'rgba(0,10,30,0.38)');
    this.vignette = g;
    this.snapCamera();
  }

  // ---------- zoom ----------
  static readonly ZOOM_MIN = 0.18;
  static readonly ZOOM_MAX = 2.6;

  private calcScale() {
    return Math.max(1, Math.round(this.baseS * this.zoom));
  }

  getZoom() { return this.zoom; }

  setZoom(z: number) {
    const nz = Math.min(FishingEngine.ZOOM_MAX, Math.max(FishingEngine.ZOOM_MIN, Number.isFinite(z) ? z : 1));
    this.zoom = nz;
    const ns = this.calcScale();
    if (ns !== this.S) {
      this.S = ns;
      this.snapCamera();
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const raw = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (raw > 0) this.fps += (1 / raw - this.fps) * 0.1;
      // timeScale > 1 dipecah jadi langkah kecil supaya fisika gulungan tetap stabil
      let rem = raw * this.timeScale;
      while (rem > 1e-6) { const st = Math.min(rem, 0.033); this.update(st); rem -= st; }
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  // status untuk HUD (dipanggil berkala oleh React)
  status(): EngineStatus {
    const sh = this.shoal;
    if (!sh) return { shoal: null, inShoal: false };
    const dx = sh.x - this.px;
    const dy = sh.y - this.py;
    return { shoal: { dist: Math.max(1, Math.round(Math.hypot(dx, dy) / TILE)), ang: Math.atan2(dy, dx), left: Math.max(0, sh.until - this.time), kind: sh.kind }, inShoal: this.castInShoal && this.phase !== 'idle' };
  }
  // ---------- Mode Developer (dipakai lewat panel Dev, hanya untuk role Developer) ----------
  auto = false; // auto fishing: lempar, tarik, gulung, lalu ulang sendiri
  timeScale = 1; // pengali kecepatan game (1 = normal)
  instantBite = false; // ikan langsung menggigit setelah lempar
  forceRarity: Rarity | null = null; // paksa rarity ikan berikutnya (uji tampilan / ekonomi)
  forceSize: SizeTier | null = null; // paksa ukuran (kecil / sedang / besar); null = tergantung hoki
  fps = 0;
  private autoT = 0;
  private autoPh: Phase = 'idle';

  setAuto(on: boolean) {
    if (this.auto === on) return;
    this.auto = on;
    this.autoT = 0;
    if (!on) this.holding = false;
    this.ev.onAuto?.(on);
  }
  setTimeScale(n: number) { this.timeScale = clamp(n, 0.25, 6); }
  setInstantBite(b: boolean) { this.instantBite = b; }
  setForceRarity(r: Rarity | null) { this.forceRarity = r; }
  setForceSize(t: SizeTier | null) { this.forceSize = t; }
  devShoal(kind: 'ikan' | 'hiu' | 'raksasa') { this.spawnShoal(true, kind); }
  devInfo() {
    return { fps: Math.round(this.fps), phase: this.phase, level: this.level, luck: this.luck, timeScale: this.timeScale, shoal: !!this.shoal, tileX: Math.floor(this.px / TILE), tileY: Math.floor(this.py / TILE) };
  }

  // Pilih ikan acak dengan rarity tertentu (dipakai forceRarity)
  private rollForced(r: Rarity): Catch {
    const pool = SPECIES.filter((sp) => sp.rarity === r);
    const species = pool[Math.floor(Math.random() * pool.length)];
    const raw = species.min + (species.max - species.min) * Math.pow(Math.random(), 1.7);
    const weight = raw < 1 ? Math.round(raw * 1000) / 1000 : Math.round(raw * 100) / 100;
    return { species, weight };
  }

  // Dipanggil tiap langkah update. Meniru pemain: lempar -> tarik saat gigit -> tahan/lepas tombol supaya zona hijau ngikutin ikan.
  private autoStep(dt: number) {
    if (!this.auto) return;
    const ph = this.phase;
    if (ph !== this.autoPh) { this.autoPh = ph; this.autoT = 0; }
    this.autoT += dt;
    if (ph === 'idle') {
      if (this.bagFull || this.moving || this.autoT < 0.45) return; // tas penuh: tunggu UI jual dulu
      this.autoT = 0;
      if (!this.findTarget()) { this.setAuto(false); this.ev.onToast?.('Auto berhenti: hadapkan karakter ke air dulu'); return; }
      this.tryCast();
    } else if (ph === 'bite') {
      if (this.autoT >= 0.12) this.hook();
    } else if (ph === 'reel') {
      // Bang-bang controller: bandingkan posisi berhenti zona (kalau direm sekarang) dengan posisi ikan.
      const r = this.reel;
      const center = r.zone + r.zoneH / 2;
      const rest = r.zoneV > 0 ? center + (r.zoneV * r.zoneV) / 380 : center - (r.zoneV * r.zoneV) / 460;
      const aim = r.fishPos + (r.fishTarget - r.fishPos) * 0.15;
      this.holding = rest < aim;
    } else if (ph === 'result') {
      if (this.autoT >= 0.5) this.resume();
    }
  }

  // untuk pengujian
  forceShoal() { this.spawnShoal(true); }
  forceShark() { this.spawnShoal(true, 'hiu'); }
  castTo(dir: Dir) { this.dir = dir; this.tryCast(); }
  step(dt: number) { this.update(dt); this.render(); }
  debug() { return { phase: this.phase, reel: this.reel, fish: this.fish, px: this.px, py: this.py, dir: this.dir, S: this.S }; }

  // ---------- logika ----------
  private setPhase(p: Phase) {
    this.phase = p;
    this.ev.onPhase?.(p);
  }

  private free(x: number, y: number) {
    const pts: [number, number][] = [[x - 4, y - 3], [x + 4, y - 3], [x - 4, y - 0.5], [x + 4, y - 0.5]];
    for (const [ax, ay] of pts) {
      const tx = Math.floor(ax / TILE);
      const ty = Math.floor(ay / TILE);
      if (tx < 0 || ty < 0 || tx >= this.world.w || ty >= this.world.h) return false;
      if (this.world.blocked[ty][tx]) return false;
    }
    return true;
  }

  private findTarget(tier = 0): Target | null {
    const w = this.world;
    const d = DIRV[this.dir];
    const ptx = Math.floor(this.px / TILE);
    const pty = Math.floor((this.py - 1) / TILE);
    let found: [number, number] | null = null;
    for (let i = 1; i <= 6; i++) {
      const tx = ptx + d.x * i;
      const ty = pty + d.y * i;
      if (tx < 0 || ty < 0 || tx >= w.w || ty >= w.h) return null;
      const t = w.tiles[ty][tx];
      if (isWater(t)) { found = [tx, ty]; break; }
      if (t === 'plank') continue;
      if (w.blocked[ty][tx]) return null;
    }
    if (!found) return null;
    let [tx, ty] = found;
    const extra = tier === 0 ? 1 + Math.floor(Math.random() * 2) : tier === 1 ? 4 : 8;
    for (let k = 0; k < extra; k++) {
      const nx = tx + d.x;
      const ny = ty + d.y;
      if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h || !isWater(w.tiles[ny][nx])) break;
      tx = nx;
      ty = ny;
    }
    return { tx, ty, wx: (tx + 0.5) * TILE, wy: (ty + 0.5) * TILE };
  }

  private ensureSpots(): [number, number][] {
    const w = this.world;
    if (!this.waterSpots) {
      const spots: [number, number][] = [];
      for (let ty = 2; ty < w.h - 2; ty++) {
        for (let tx = 2; tx < w.w - 2; tx++) {
          if (!isWater(w.tiles[ty][tx])) continue;
          let nearLand = false;
          for (let yy = -3; yy <= 3 && !nearLand; yy++) {
            for (let xx = -3; xx <= 3; xx++) {
              const t = w.tiles[ty + yy]?.[tx + xx];
              if (t === 'sand' || t === 'grass' || t === 'dirt' || t === 'plank') { nearLand = true; break; }
            }
          }
          if (nearLand) spots.push([tx, ty]);
        }
      }
      this.waterSpots = spots;
    }
    return this.waterSpots || [];
  }

  // jadwal gerombolan dihitung dari jam server, jadi SAMA untuk semua pemain
  private sharedEvent(nowMs: number): { id: number; kind: 'ikan' | 'hiu' | 'raksasa'; tx: number; ty: number; end: number } | null {
    const SLOT = 150000;
    const spots = this.ensureSpots();
    if (!spots.length) return null;
    const n = Math.floor(nowMs / SLOT);
    const rnd = mulberry32(((n * 2654435761) >>> 0) ^ 0x5bd1e995);
    if (rnd() > 0.85) return null;
    const kind: 'ikan' | 'hiu' | 'raksasa' = rnd() < 0.3 ? 'hiu' : 'ikan';
    const start = n * SLOT + 5000 + rnd() * 55000;
    const end = start + (kind === 'hiu' ? 80000 : 60000);
    const [tx, ty] = spots[Math.floor(rnd() * spots.length)];
    return nowMs >= start && nowMs < end ? { id: n, kind, tx, ty, end } : null;
  }

  private syncSharedShoal() {
    const nowMs = Date.now() + this.clockOffset;
    const ev = this.sharedEvent(nowMs);
    if (ev) {
      const left = (ev.end - nowMs) / 1000;
      if (!this.shoal || this.shoalId !== ev.id) {
        this.shoal = { x: (ev.tx + 0.5) * TILE, y: (ev.ty + 0.5) * TILE, r: (ev.kind === 'hiu' ? 4 : 3.4) * TILE, until: this.time + left, kind: ev.kind };
        this.shoalId = ev.id;
        this.ev.onToast?.(ev.kind === 'hiu' ? 'Hiu Legendary muncul! Cari bayangannya' : 'Ada gerombolan ikan! Cari yang berkilau di laut');
      } else {
        this.shoal.until = this.time + left;
      }
    } else if (this.shoal && !this.shoalForced) {
      this.shoal = null;
      this.castInShoal = false;
      this.shoalId = -1;
    }
  }

  private spawnShoal(force = false, kind?: 'ikan' | 'hiu' | 'raksasa') {
    const spots = this.ensureSpots();
    if (!spots.length) return;
    const ptx = this.px / TILE;
    const pty = this.py / TILE;
    const far = spots.filter(([x, y]) => { const d = Math.hypot(x - ptx, y - pty); return d >= 9 && d <= 40; });
    const pool = far.length ? far : spots;
    const [tx, ty] = pool[Math.floor(Math.random() * pool.length)];
    const pickKind = (): 'ikan' | 'hiu' | 'raksasa' => {
      if (force) return 'ikan';
      const r = Math.random();
      return r < 0.07 ? 'raksasa' : r < 0.3 ? 'hiu' : 'ikan';
    };
    const k: 'ikan' | 'hiu' | 'raksasa' = kind || pickKind();
    this.shoal = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, r: (k === 'raksasa' ? 6 : k === 'hiu' ? 4 : 3.4) * TILE, until: this.time + (k === 'raksasa' ? 100 : k === 'hiu' ? 80 : force ? 90 : 60), kind: k };
    this.shoalForced = true;
    this.shoalId = -2;
    if (k === 'hiu') this.ev.onToast?.('Hiu Legendary muncul! Cari bayangannya');
    if (k === 'raksasa') this.ev.onToast?.('Bayangan RAKSASA muncul di laut! Cari dan lempar umpanmu');
  }

  private drawSharkEvent(ctx: CanvasRenderingContext2D, sh: Shoal, t: number) {
    const a = t * 0.45;
    const sx = sh.x + Math.cos(a) * sh.r * 0.5;
    const sy = sh.y + Math.sin(a) * sh.r * 0.28;
    const hd = Math.atan2(Math.cos(a) * 0.28, -Math.sin(a) * 0.5);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(hd);
    ctx.fillStyle = 'rgba(6,28,60,0.42)';
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-24, -7); ctx.lineTo(-22, 0); ctx.lineTo(-24, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(sx, sy + 1, 9, 3, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#5f7083';
    ctx.beginPath(); ctx.moveTo(sx - 5, sy + 1); ctx.lineTo(sx + 1, sy - 12); ctx.lineTo(sx + 6, sy + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8fa3b8';
    ctx.fillRect(Math.round(sx), Math.round(sy - 8), 1, 6);
  }

  private drawGiantEvent(ctx: CanvasRenderingContext2D, sh: Shoal, t: number) {
    const a = t * 0.22;
    const sx = sh.x + Math.cos(a) * sh.r * 0.42;
    const sy = sh.y + Math.sin(a) * sh.r * 0.2;
    const hd = Math.atan2(Math.cos(a) * 0.2, -Math.sin(a) * 0.42);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(hd);
    ctx.fillStyle = 'rgba(6,28,60,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 0, 58, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(-84, -22); ctx.lineTo(-76, 0); ctx.lineTo(-84, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(20,70,110,0.35)';
    ctx.beginPath(); ctx.ellipse(8, -2, 34, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const k = (t * 0.6) % 1;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.75 * (1 - k)).toFixed(3) + ')';
    for (let i = 0; i < 7; i++) {
      const jx = sx + Math.sin(i * 2.1 + t) * (3 + k * 10);
      const jy = sy - 4 - k * 26 + (i / 7) * 6;
      ctx.fillRect(Math.round(jx), Math.round(jy), 2, 2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(sx, sy + 1, 30, 9, 0, 0, Math.PI * 2); ctx.stroke();
  }

  private tryCast(tier = 0) {
    if (this.bagFull) { this.ev.onToast?.('Tas penuh! Jual ikan dulu.'); return; }
    const t = this.findTarget(tier);
    if (!t) { this.ev.onToast?.('Hadapkan karakter ke air dulu'); return; }
    this.castTier = tier;
    this.target = t;
    this.castT = 0;
    const sh = this.shoal;
    this.castInShoal = !!sh && Math.hypot(t.wx - sh.x, t.wy - sh.y) <= sh.r;
    this.castKind = sh ? sh.kind : 'ikan';
    if (this.castInShoal) this.ev.onToast?.(this.castKind === 'raksasa' ? 'Sesuatu yang SANGAT besar menyambar umpanmu!' : this.castKind === 'hiu' ? 'Hiu raksasa menyambar umpanmu!' : 'Kena gerombolan ikan! Peluang langka naik');
    this.setPhase('cast');
  }

  private hook() {
    if (!this.fish) return;
    const e = this.ease;
    const diff = Math.max(0.8, RARITY[this.fish.species.rarity].diff * (1 - 0.18 * e));
    this.reel = {
      fishPos: 50, fishTarget: 50, tNext: 0.5,
      zone: 36, zoneV: 0,
      zoneH: 28 + Math.min(10, this.level * 0.35) + 10 * e,
      prog: 33 + 12 * e, time: 0, diff,
    };
    this.holding = true;
    this.setPhase('reel');
  }

  private escape(msg: string) {
    if (this.target) this.splash(this.target.wx, this.target.wy, 10);
    this.ev.onToast?.(msg);
    this.target = null;
    this.fish = null;
    this.holding = false;
    this.setPhase('idle');
  }

  private splash(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = 20 + Math.random() * 36;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.5 + Math.random() * 0.4, col: Math.random() < 0.6 ? '#ffffff' : '#bfeaff' });
    }
  }

  private inputVec(): { x: number; y: number } {
    let x = this.joyX;
    let y = this.joyY;
    const k = this.keys;
    if (k.has('ArrowLeft') || k.has('KeyA')) x -= 1;
    if (k.has('ArrowRight') || k.has('KeyD')) x += 1;
    if (k.has('ArrowUp') || k.has('KeyW')) y -= 1;
    if (k.has('ArrowDown') || k.has('KeyS')) y += 1;
    const m = Math.hypot(x, y);
    if (m < 0.2) return { x: 0, y: 0 };
    if (m > 1) { x /= m; y /= m; }
    return { x, y };
  }

  private update(dt: number) {
    this.time += dt;
    this.autoStep(dt);
    const ph = this.phase;

    // gerak
    const canMove = ph === 'idle' || ph === 'cast' || ph === 'wait';
    const v = canMove ? this.inputVec() : { x: 0, y: 0 };
    this.moving = v.x !== 0 || v.y !== 0;
    if (this.moving) {
      if ((ph === 'cast' || ph === 'wait') && Math.hypot(v.x, v.y) > 0.3) this.cancel();
      const spd = 56;
      const nx = this.px + v.x * spd * dt;
      if (this.free(nx, this.py)) this.px = nx;
      const ny = this.py + v.y * spd * dt;
      if (this.free(this.px, ny)) this.py = ny;
      if (Math.abs(v.x) > Math.abs(v.y)) this.dir = v.x > 0 ? 'right' : 'left';
      else this.dir = v.y > 0 ? 'down' : 'up';
      this.stepT += dt;
    } else {
      this.stepT = 0;
    }

    // dekat Toko Mancing? (hanya prop 'shop' yang fungsional, warung lain cuma dekorasi)
    {
      let near = false;
      for (const p of this.world.props) {
        if (p.kind !== 'shop') continue;
        const cx = (p.x + (p.w || 4) / 2) * TILE;
        const cy = (p.y + (p.h || 3)) * TILE;
        if (Math.hypot(this.px - cx, this.py - cy) < TILE * 3.6) { near = true; break; }
      }
      if (near !== this.nearShopNow) { this.nearShopNow = near; this.ev.onNearShop?.(near); }
    }

    // event Gerombolan Ikan
    if (this.shoal && this.shoalForced) {
      if (this.time >= this.shoal.until) { this.shoal = null; this.castInShoal = false; this.shoalForced = false; this.shoalId = -1; }
    } else {
      this.syncSharedShoal();
    }
    // pemain lain: geser halus menuju posisi terbaru dari server
    for (const r of this.remotes.values()) {
      const dx = (r.p.x ?? 0) - r.rx;
      const dy = (r.p.y ?? 0) - r.ry;
      const dd = Math.hypot(dx, dy);
      if (dd > 64) { r.rx = (r.p.x ?? 0); r.ry = (r.p.y ?? 0); }
      else { const k = 1 - Math.exp(-dt * 9); r.rx += dx * k; r.ry += dy * k; }
      r.moving = r.p.moving || dd > 1.2;
      if (r.moving) r.step += dt; else r.step = 0;
    }

    if (this.charging) {
      if (this.phase !== 'idle') this.charging = false;
      else {
        this.charge += dt * 0.85; // penuh = mulai lagi dari bawah
        if (this.charge >= 1) this.charge = 0;
      }
    }

    // fase mancing
    if (this.phase === 'cast') {
      this.castT += dt;
      if (this.castT >= 0.5 && this.target) {
        this.waitT = this.instantBite ? 0.2 : (2 + Math.random() * 5) * (this.castInShoal ? 0.45 : 1) * [1, 1.2, 1.45][this.castTier];
        this.ripples.push({ x: this.target.wx, y: this.target.wy, t: 0 });
        this.splash(this.target.wx, this.target.wy, 8);
        this.setPhase('wait');
      }
    } else if (this.phase === 'wait' && this.target) {
      this.waitT -= dt;
      if (Math.random() < dt * 0.7) this.ripples.push({ x: this.target.wx + (Math.random() - 0.5) * 6, y: this.target.wy + (Math.random() - 0.5) * 3, t: 0.55 });
      if (this.waitT <= 0) {
        let rolled = this.castInShoal && this.castKind === 'raksasa' && Math.random() < Math.min(0.7, 0.25 + (this.luck + this.tierLuck()) * 0.4 + this.level / 250) ? rollGiant() : this.castInShoal && this.castKind === 'hiu' && Math.random() < Math.min(0.8, 0.15 + (this.luck + this.tierLuck()) * 0.5 + this.level / 200) ? rollShark() : rollFish(this.level, (this.luck + this.tierLuck()) + (this.castInShoal ? 2 : 0), Math.random, this.rodPower);
        if (this.forceRarity) rolled = this.rollForced(this.forceRarity);
        if (this.forceSize) rolled = withSize(rolled, this.forceSize);
        this.fish = rolled;
        this.biteT = 1.5 + 0.9 * this.ease;
        this.ripples.push({ x: this.target.wx, y: this.target.wy, t: 0 });
        this.splash(this.target.wx, this.target.wy, 6);
        this.setPhase('bite');
        this.ev.onBite?.();
      }
    } else if (this.phase === 'bite') {
      this.biteT -= dt;
      if (this.target && Math.random() < dt * 8) this.ripples.push({ x: this.target.wx, y: this.target.wy, t: 0.3 });
      if (this.biteT <= 0) this.escape('Terlambat! Ikannya kabur.');
    } else if (this.phase === 'reel') {
      this.updateReel(dt);
    } else if (this.phase === 'catching') {
      this.catchT += dt;
      if (this.catchT >= 0.9 && this.fish) {
        const c = this.fish;
        this.setPhase('result');
        this.ev.onCatch?.(c);
      }
    }

    // efek
    for (const r of this.ripples) r.t += dt * 1.1;
    this.ripples = this.ripples.filter((r) => r.t < 1);
    for (const p of this.parts) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 110 * dt;
    }
    this.parts = this.parts.filter((p) => p.life < p.max);

    // kamera
    const vw = (this.cssW * this.dpr) / this.S;
    const vh = (this.cssH * this.dpr) / this.S;
    const wpx = this.world.w * TILE;
    const hpx = this.world.h * TILE;
    const tx = wpx <= vw ? (wpx - vw) / 2 : clamp(this.px - vw / 2, 0, wpx - vw);
    const ty = hpx <= vh ? (hpx - vh) / 2 : clamp(this.py - 10 - vh / 2, 0, hpx - vh);
    const k = Math.min(1, dt * 7);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
  }

  private snapCamera() {
    const vw = (this.cssW * this.dpr) / this.S;
    const vh = (this.cssH * this.dpr) / this.S;
    const wpx = this.world.w * TILE;
    const hpx = this.world.h * TILE;
    this.camX = wpx <= vw ? (wpx - vw) / 2 : clamp(this.px - vw / 2, 0, wpx - vw);
    this.camY = hpx <= vh ? (hpx - vh) / 2 : clamp(this.py - 10 - vh / 2, 0, hpx - vh);
  }

  private updateReel(dt: number) {
    const r = this.reel;
    r.time += dt;
    if (!this.target || !this.fish) return;

    // ikan bergerak ke titik acak, kadang menyentak ke ujung
    r.tNext -= dt;
    if (r.tNext <= 0) {
      r.fishTarget = 8 + Math.random() * 84;
      if (Math.random() < 0.16 * r.diff) r.fishTarget = Math.random() < 0.5 ? 5 : 95;
      r.tNext = (0.55 + Math.random() * 1.0) / r.diff;
    }
    const dp = r.fishTarget - r.fishPos;
    r.fishPos += Math.sign(dp) * Math.min(Math.abs(dp), 34 * r.diff * dt);

    // zona hijau: tahan = naik, lepas = turun
    r.zoneV = clamp(r.zoneV + (this.holding ? 230 : -190) * dt, -85, 85);
    r.zone += r.zoneV * dt;
    const maxZone = 100 - r.zoneH;
    if (r.zone < 0) { r.zone = 0; r.zoneV = Math.abs(r.zoneV) * 0.25; }
    if (r.zone > maxZone) { r.zone = maxZone; r.zoneV = -Math.abs(r.zoneV) * 0.25; }

    const inZone = r.fishPos >= r.zone && r.fishPos <= r.zone + r.zoneH;
    const e = this.ease;
    r.prog = clamp(r.prog + (inZone ? 24 * (1 + 0.3 * e) : -(12 + 6 * r.diff) * (1 - 0.3 * e)) * dt, 0, 100);

    this.reelRip -= dt;
    if (this.reelRip <= 0) {
      this.reelRip = 0.22;
      this.ripples.push({ x: this.target.wx + (Math.random() - 0.5) * 8, y: this.target.wy + (Math.random() - 0.5) * 4, t: 0.2 });
      if (inZone) this.splash(this.target.wx, this.target.wy, 2);
    }

    if (r.prog >= 100) {
      this.catchT = 0;
      this.splash(this.target.wx, this.target.wy, 16);
      this.holding = false;
      this.setPhase('catching');
    } else if (r.prog <= 0 || r.time > 40) {
      this.escape('Yah, ikannya lepas!');
    }
  }

  // ---------- gambar ----------
  private render() {
    const ctx = this.ctx;
    const S = this.S;
    const w = this.world;
    const CW = this.canvas.width;
    const CH = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2872b4';
    ctx.fillRect(0, 0, CW, CH);

    const ox = Math.round(this.camX * S);
    const oy = Math.round(this.camY * S);
    ctx.setTransform(S, 0, 0, S, -ox, -oy);
    const vx0 = ox / S;
    const vy0 = oy / S;
    const vw = CW / S;
    const vh = CH / S;

    ctx.drawImage(w.terrain, 0, 0);

    // kilau air
    const tx0 = Math.max(0, Math.floor(vx0 / TILE) - 1);
    const ty0 = Math.max(0, Math.floor(vy0 / TILE) - 1);
    const tx1 = Math.min(w.w - 1, Math.ceil((vx0 + vw) / TILE) + 1);
    const ty1 = Math.min(w.h - 1, Math.ceil((vy0 + vh) / TILE) + 1);
    const t = this.time;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const tt = w.tiles[ty][tx];
        if (tt !== 'deep' && tt !== 'shallow') continue;
        const ph = tx * 0.9 + ty * 1.7;
        const a = 0.2 + 0.12 * Math.sin(t * 2 + ph);
        const lx = (t * 4 + ph * 5.3) % 10;
        ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
        ctx.fillRect(tx * TILE + Math.floor(lx), ty * TILE + ((ty * 5 + tx * 3) % 11) + 3, 5, 1);
        if ((tx * 7 + ty * 13 + Math.floor(t * 2)) % 23 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillRect(tx * TILE + 6, ty * TILE + 8, 2, 1);
        }
      }
    }

    const sh = this.shoal;
    if (sh && sh.x > vx0 - 70 && sh.x < vx0 + vw + 70 && sh.y > vy0 - 70 && sh.y < vy0 + vh + 70) {
      const k = (t * 0.8) % 1;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - k)).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(sh.x, sh.y, 8 + k * sh.r * 0.85, 4 + k * sh.r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (sh.kind === 'hiu') this.drawSharkEvent(ctx, sh, t);
      else if (sh.kind === 'raksasa') this.drawGiantEvent(ctx, sh, t);
      for (let i = 0; i < (sh.kind === 'ikan' ? 11 : 3); i++) {
        const dir = i % 2 ? 1 : -1;
        const a = t * 0.7 * dir + i * 0.57;
        const rr = 7 + ((i * 37) % 19) * 1.3;
        const fx = sh.x + Math.cos(a) * rr * 1.7;
        const fy = sh.y + Math.sin(a) * rr * 0.95;
        const heading = Math.atan2(Math.cos(a) * dir * 0.95, -Math.sin(a) * dir * 1.7);
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(heading);
        ctx.fillStyle = 'rgba(8,48,104,0.38)';
        ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 1.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-6.2, -1.9); ctx.lineTo(-6.2, 1.9); ctx.closePath(); ctx.fill();
        ctx.restore();
        if ((i + Math.floor(t * 3)) % 7 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(Math.round(fx + 2), Math.round(fy - 3), 1, 1); }
      }
    }

    for (const r of this.ripples) drawRipple(ctx, r.x, r.y, r.t);

    // posisi umpan
    const ph = this.phase;
    const tg = this.target;
    const rod = ph === 'cast' || ph === 'wait' || ph === 'bite' || ph === 'reel' || ph === 'catching';
    const shake = ph === 'reel' ? Math.sin(t * 40) * 1.2 : ph === 'bite' ? Math.sin(t * 50) * 1.4 : 0;
    const geo = rodGeometry(Math.round(this.px), Math.round(this.py), this.dir, shake);
    let bx = 0;
    let by = 0;
    let showBobber = false;
    if (tg && (ph === 'wait' || ph === 'bite')) {
      bx = tg.wx; by = tg.wy; showBobber = true;
      const dip = ph === 'bite' ? 2.5 + Math.sin(t * 38) * 1.3 : Math.sin(t * 3) * 0.7;
      drawBobber(ctx, bx, by, dip, this.profile.rodId || 'default');
      by += dip;
    } else if (tg && ph === 'cast') {
      const k = Math.min(1, this.castT / 0.5);
      bx = geo.tx + (tg.wx - geo.tx) * k;
      by = geo.ty + (tg.wy - geo.ty) * k - Math.sin(k * Math.PI) * 16;
      showBobber = true;
      drawBobber(ctx, bx, by, 0, this.profile.rodId || 'default');
    } else if (tg && ph === 'reel') {
      bx = tg.wx; by = tg.wy;
    }

    // objek berurutan menurut y
    type Ent = { y: number; f: () => void };
    const ents: Ent[] = [];
    for (const p of w.props) {
      const bxp = p.x * TILE;
      const byp = p.y * TILE;
      const pw = (p.w || 1) * TILE;
      const ph2 = (p.h || 1) * TILE;
      if (bxp + pw < vx0 - 30 || bxp > vx0 + vw + 30 || byp + ph2 < vy0 - 30 || byp > vy0 + vh + 40) continue;
      switch (p.kind) {
        case 'palm': ents.push({ y: byp + 15, f: () => drawPalm(ctx, p, t) }); break;
        case 'rock': ents.push({ y: byp + 13, f: () => drawRock(ctx, p) }); break;
        case 'fountain': ents.push({ y: byp + ph2 - 6, f: () => drawFountain(ctx, p, t) }); break;
        case 'bench': ents.push({ y: byp + 14, f: () => drawBench(ctx, p) }); break;
        case 'table': ents.push({ y: byp + 14, f: () => drawTable(ctx, p, t) }); break;
        case 'stool': ents.push({ y: byp + 14, f: () => drawStool(ctx, p) }); break;
        case 'sign': ents.push({ y: byp + 14, f: () => drawSign(ctx, p) }); break;
        case 'bush': ents.push({ y: byp + 14, f: () => drawBush(ctx, p) }); break;
        case 'npc': ents.push({ y: byp + 15, f: () => drawNpc(ctx, p, t) }); break;
        case 'stall': ents.push({ y: byp + ph2 - 2, f: () => drawStall(ctx, p, t) }); break;
        case 'flowers': ents.push({ y: byp + 8, f: () => drawFlowers(ctx, p) }); break;
        case 'barrel': ents.push({ y: byp + 14, f: () => drawBarrel(ctx, p) }); break;
        case 'crate': ents.push({ y: byp + 14, f: () => drawCrate(ctx, p) }); break;
        case 'net': ents.push({ y: byp + 15, f: () => drawNet(ctx, p, t) }); break;
        case 'umbrella': ents.push({ y: byp + 14, f: () => drawUmbrella(ctx, p) }); break;
        case 'boat': ents.push({ y: byp + 12, f: () => drawBoat(ctx, p, t) }); break;
        case 'giantfish': ents.push({ y: byp + 20, f: () => drawGiantFish(ctx, p, t) }); break;
        case 'shop': ents.push({ y: byp + ph2 - 2, f: () => drawShop(ctx, p, t) }); break;
        case 'pine': ents.push({ y: byp + 15, f: () => drawPine(ctx, p) }); break;
        case 'lighthouse': ents.push({ y: byp + 30, f: () => drawLighthouse(ctx, p, t) }); break;
        case 'bigtree': ents.push({ y: byp + 44, f: () => drawBigTree(ctx, p) }); break;
        default: ents.push({ y: byp + 15, f: () => drawLamp(ctx, p, t) });
      }
    }
    const show = ph === 'idle' ? this.held : null;
    const rodId = this.profile.rodId || 'default';
    ents.push({
      y: this.py,
      f: () => {
        if (show && show.species.giant) drawShowFish(ctx, this.px, this.py, show.species, show.weight);
        drawPlayer(ctx, this.px, this.py, this.dir, this.moving, this.stepT, rod, shake, this.pal, rodId, !rod && !show, !!show);
        if (show && !show.species.giant) drawShowFish(ctx, this.px, this.py, show.species, show.weight);
      },
    });
    for (const r of this.remotes.values()) {
      if (r.rx < vx0 - 30 || r.rx > vx0 + vw + 30 || r.ry < vy0 - 30 || r.ry > vy0 + vh + 40) continue;
      ents.push({ y: r.ry, f: () => this.drawRemote(ctx, r, t) });
    }
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) e.f();
    for (const r of this.remotes.values()) {
      if (r.rx < vx0 - 200 || r.rx > vx0 + vw + 200 || r.ry < vy0 - 200 || r.ry > vy0 + vh + 200) continue;
      this.drawRemoteLine(ctx, r, t);
    }

    // tali pancing
    if (rod && tg && ph !== 'catching') {
      const sag = ph === 'reel' ? 2 : ph === 'cast' ? 4 : 7 + Math.sin(t * 2) * 1.2;
      drawLine(ctx, geo.tx, geo.ty, bx, by - (showBobber ? 3 : 0), sag, this.profile.rodId || 'default');
    }
    if (ph === 'bite') {
      drawBubbleAlert(ctx, this.px, this.py - 24, t);
      if (tg) { drawRipple(ctx, tg.wx, tg.wy, (t * 1.6) % 1); drawStarPop(ctx, tg.wx, tg.wy - 11, t); }
    }

    // ikan melompat ke tangan
    if (ph === 'catching' && tg && this.fish) {
      const k = Math.min(1, this.catchT / 0.9);
      const x = tg.wx + (this.px - tg.wx) * k;
      const y = tg.wy + (this.py - 14 - tg.wy) * k - Math.sin(k * Math.PI) * 26;
      drawFish(ctx, this.fish.species, x, y, 0.55, -0.9 + k * 1.8 + Math.sin(k * 20) * 0.1, this.px < tg.wx);
    }

    for (const p of this.parts) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    ctx.globalAlpha = 1;

    // lapisan layar
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.vignette) { ctx.fillStyle = this.vignette; ctx.fillRect(0, 0, CW, CH); }
    this.drawTags(ox, oy);
    if (ph === 'reel') this.drawMeter();
  }

  private drawRemote(ctx: CanvasRenderingContext2D, r: { p: RemotePlayer; rx: number; ry: number; step: number; moving: boolean; pal: Pal }, t: number) {
    const p = r.p;
    const x = Math.round(r.rx);
    const y = Math.round(r.ry);
    const sp = p.held && !p.casting ? SPECIES_BY_ID[p.held.s] : null;
    drawPlayer(ctx, x, y, p.dir, r.moving, r.step, p.casting, 0, r.pal, p.rodId, !p.casting && !sp, !!sp);
    if (sp && p.held) drawShowFish(ctx, x, y, sp, p.held.w);
  }

  /** Umpan + tali pemain lain. Digambar setelah semua objek supaya tidak tertutup pohon/bangunan. */
  private drawRemoteLine(ctx: CanvasRenderingContext2D, r: { p: RemotePlayer; rx: number; ry: number }, t: number) {
    const p = r.p;
    if (!p.casting) return;
    const x = Math.round(r.rx);
    const y = Math.round(r.ry);
    const dir: Dir = (p.dir as Dir) in DIRV ? (p.dir as Dir) : 'down';
    // kalau titik lempar belum terkirim, tebak 2,5 petak di depan karakter supaya tali tetap terlihat
    const hasT = Number(p.bx) > 0 && Number(p.by) > 0;
    const bx = hasT ? Number(p.bx) : x + DIRV[dir].x * TILE * 2.5;
    const by = hasT ? Number(p.by) : y - 1 + DIRV[dir].y * TILE * 2.5;
    const g = rodGeometry(x, y, dir, 0);
    const dip = Math.sin(t * 3 + x);
    drawBobber(ctx, bx, by, dip, p.rodId || 'default');
    drawLine(ctx, g.tx, g.ty, bx, by - 3, 7, p.rodId || 'default');
  }

  private pillText(text: string, cx: number, cy: number, size: number, bg: string, fg: string, padX: number, stroke?: string) {
    const ctx = this.ctx;
    ctx.font = '700 ' + size + 'px "Pixelify Sans", ui-monospace, monospace';
    const tw = ctx.measureText(text).width;
    const h = size * 1.7;
    const w = tw + padX * 2;
    ctx.fillStyle = bg;
    this.rrect(cx - w / 2, cy - h / 2, w, h, h / 2.6);
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, size * 0.14); ctx.stroke(); }
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + size * 0.06);
    return w;
  }

  private outlined(text: string, cx: number, cy: number, size: number, fg: string) {
    const ctx = this.ctx;
    ctx.font = '700 ' + size + 'px "Pixelify Sans", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.5, size * 0.16);
    ctx.strokeStyle = 'rgba(20,14,8,0.35)';
    ctx.strokeText(text, cx, cy);
    ctx.fillStyle = fg;
    ctx.fillText(text, cx, cy);
  }

  // label nama di atas karakter & NPC (digambar di layar supaya tajam)
  private drawTags(ox: number, oy: number) {
    const ctx = this.ctx;
    const S = this.S;
    const d = this.dpr;
    const u = Math.min(1.7, Math.max(0.8, this.cssH / 360)) * d;
    const sz = 11 * u;
    const sxp = this.px * S - ox;
    const syHead = (this.py - 21) * S - oy;
    const syFeet = this.py * S - oy;
    if (this.charging && this.phase === 'idle') {
      // bar tenaga lempar: tegak di samping karakter, hijau (dekat) -> merah (jauh)
      const N = 9;
      const cols = ['#4ade80', '#4ade80', '#4ade80', '#a3e635', '#facc15', '#fb923c', '#f97316', '#ef4444', '#ef4444'];
      const bw = Math.max(11 * u, 4.4 * S);
      const bh = Math.max(74 * u, 31 * S);
      const gap = Math.max(1.4 * u, 0.5 * S);
      const off = Math.max(14 * u, 7 * S);
      let bx = sxp + off;
      if (bx + bw + 8 * u > this.canvas.width - 96 * u) bx = sxp - off - bw; // dekat tombol aksi -> pindah ke kiri karakter
      const by = syFeet - bh + 3 * u;
      const pad = Math.max(2.4 * u, 0.9 * S);
      ctx.fillStyle = '#ffffff';
      this.rrect(bx - pad, by - pad, bw + pad * 2, bh + pad * 2, 5 * u);
      ctx.fill();
      ctx.fillStyle = '#3a3330';
      this.rrect(bx, by, bw, bh, 3.5 * u);
      ctx.fill();
      const fh = Math.max(0, this.charge * bh);
      if (fh > 0) {
        const gr = ctx.createLinearGradient(0, by + bh, 0, by);
        gr.addColorStop(0, '#ffd23f'); gr.addColorStop(0.55, '#ff9f1c'); gr.addColorStop(1, '#ef4a2f');
        ctx.fillStyle = gr;
        this.rrect(bx, by + bh - fh, bw, fh, Math.min(3.5 * u, fh / 2));
        ctx.fill();
      }
      const tr = this.charge < 0.34 ? 0 : this.charge < 0.67 ? 1 : 2;
      this.pillText(['Normal', 'Sedang', 'Jauh'][tr], bx + bw / 2, by - pad - 12 * u, sz * 0.9, 'rgba(18,16,14,0.85)', ['#4ade80', '#facc15', '#ef4444'][tr], 8 * u);
    }
    // label warung dan ikan raksasa
    for (const p of this.world.props) {
      if (p.kind !== 'giantfish') continue; // warung = dekorasi murni, tanpa label
      const lx = (p.x * TILE + ((p.w || 1) * TILE) / 2) * S - ox;
      const ly = (p.y * TILE + (p.kind === 'giantfish' ? 8 : -4)) * S - oy;
      if (lx < -300 || lx > this.canvas.width + 300 || ly < -100 || ly > this.canvas.height + 100) continue;
      this.pillText((p.name || '') + (p.role ? ' · ' + p.role : ''), lx, ly, sz * 0.92, 'rgba(18,16,14,0.82)', p.kind === 'giantfish' ? '#ffd9a0' : '#f3ead8', 8 * u, p.kind === 'giantfish' ? 'rgba(255,170,60,0.95)' : 'rgba(245,196,81,0.9)');
    }
    // pemain lain: nama + gelembung chat
    const nowS = performance.now() / 1000;
    for (const r of this.remotes.values()) {
      const rx = r.rx * S - ox;
      const ry = (r.ry - 21 - (r.p.held && !r.p.casting ? 24 : 0)) * S - oy;
      if (rx < -200 || rx > this.canvas.width + 200 || ry < -100 || ry > this.canvas.height + 100) continue;
      this.pillText(r.p.name + ' · Lv' + r.p.level, rx, ry - 10 * u, sz * 0.85, 'rgba(18,16,14,0.82)', '#eaf7ff', 7 * u, 'rgba(110,200,255,0.9)');
      const b = this.bubbles.get(r.p.id);
      if (b && b.until > nowS) this.pillText(b.text, rx, ry - 34 * u, sz * 0.95, '#ffffff', '#222222', 9 * u, 'rgba(60,60,60,0.35)');
    }
    const mine = this.bubbles.get('me');
    if (mine && mine.until > nowS) this.pillText(mine.text, sxp, syHead - 34 * u, sz * 0.95, '#ffffff', '#222222', 9 * u, 'rgba(60,60,60,0.35)');
    // NPC
    for (const p of this.world.props) {
      if (p.kind !== 'npc') continue;
      const nx = (p.x * TILE + 8) * S - ox;
      const nyHead = (p.y * TILE + 15 - 21) * S - oy;
      if (nx < -200 || nx > this.canvas.width + 200 || nyHead < -200 || nyHead > this.canvas.height + 100) continue;
      const near = Math.hypot(this.px - (p.x * TILE + 8), this.py - (p.y * TILE + 15)) < TILE * 3.6;
      this.pillText((p.name || '') + ' · ' + (p.role || ''), nx, nyHead - 10 * u, sz * 0.92, 'rgba(18,16,14,0.82)', '#f3ead8', 8 * u, 'rgba(245,196,81,0.9)');
      const showTip = near && nyHead > 150 * u; // jangan tampilkan gelembung kalau ketutup HUD atas
      if (!showTip) {
        const qy = nyHead - 38 * u;
        const qr = 9 * u;
        ctx.fillStyle = '#f5c451';
        ctx.strokeStyle = '#6b4a0a';
        ctx.lineWidth = Math.max(1.5, u);
        ctx.beginPath(); ctx.arc(nx, qy, qr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#4a3206';
        ctx.font = '700 ' + qr * 1.3 + 'px "Pixelify Sans", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', nx, qy + qr * 0.08);
      }
      if (showTip) {
        const tip = TIPS[Math.max(0, Math.floor((Number.isFinite(this.time) ? this.time : 0) / 6)) % TIPS.length] || TIPS[0];
        ctx.font = '700 ' + sz * 0.95 + 'px "Pixelify Sans", ui-monospace, monospace';
        const maxW = 150 * u;
        const words = tip.split(' ');
        const lines: string[] = [];
        let cur = '';
        for (const wd of words) {
          const tt = cur ? cur + ' ' + wd : wd;
          if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = tt;
        }
        if (cur) lines.push(cur);
        const lh = sz * 1.3;
        const bw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width))) + 14 * u;
        const bh = lines.length * lh + 10 * u;
        const bx = nx - bw / 2;
        const by = nyHead - 34 * u - bh;
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        this.rrect(bx, by, bw, bh, 8 * u);
        ctx.fill();
        ctx.beginPath(); ctx.moveTo(nx - 5 * u, by + bh - 1); ctx.lineTo(nx + 5 * u, by + bh - 1); ctx.lineTo(nx, by + bh + 7 * u); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2b2118';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        lines.forEach((l, i) => ctx.fillText(l, nx, by + 5 * u + lh * (i + 0.5)));
      }
    }
    // pemain
    const pr = this.profile;
    if (pr.title) {
      const cy = syHead - 46 * u;
      ctx.font = '700 ' + sz * 0.9 + 'px "Pixelify Sans", ui-monospace, monospace';
      const tw = ctx.measureText(pr.title).width;
      const w = tw + 30 * u;
      const h = sz * 1.6;
      ctx.fillStyle = '#d7efd0';
      this.rrect(sxp - w / 2, cy - h / 2, w, h, h / 2.4);
      ctx.fill();
      ctx.strokeStyle = '#5faa66';
      ctx.lineWidth = Math.max(1, u * 0.9);
      ctx.stroke();
      // ikon kecil di kiri
      ctx.fillStyle = '#4aa356';
      this.rrect(sxp - w / 2 + 4 * u, cy - h * 0.32, h * 0.64, h * 0.64, 2 * u);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(sxp - w / 2 + 6.2 * u, cy + h * 0.2);
      ctx.lineTo(sxp - w / 2 + 4 * u + h * 0.32, cy - h * 0.2);
      ctx.lineTo(sxp - w / 2 + 4 * u + h * 0.6, cy + h * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2c5a33';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(pr.title, sxp - w / 2 + 20 * u, cy + sz * 0.05);
    }
    const nm = (pr.name || 'Tamu') + ' · Lv' + pr.level;
    this.outlined(nm, sxp, syHead - 24 * u, sz * 1.05, '#ffffff');
    if (pr.name && pr.name !== 'Tamu') {
      // lencana centang biru di ujung nama
      ctx.font = '700 ' + sz * 1.05 + 'px "Pixelify Sans", ui-monospace, monospace';
      const bx = sxp + ctx.measureText(nm).width / 2 + 9 * u;
      const by = syHead - 24 * u;
      const br = 6 * u;
      ctx.fillStyle = '#4aa3ff';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(1, u * 0.8);
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, u * 1.4);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(bx - br * 0.45, by); ctx.lineTo(bx - br * 0.1, by + br * 0.35); ctx.lineTo(bx + br * 0.5, by - br * 0.35); ctx.stroke();
    }
  }

  private drawMeter() {
    const ctx = this.ctx;
    const r = this.reel;
    const d = this.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const topOff = this.cssH < 500 ? 62 : 96;
    const avail = this.cssH - topOff - 110;
    const mh = clamp(avail, 110, 220);
    const top = topOff + Math.max(0, (avail - mh) / 2) + 14;
    const pad = 3;
    const inner = mh - pad * 2;
    const ypx = (pos: number) => top + mh - pad - (pos / 100) * inner;
    const mw = clamp(this.cssH * 0.1, 30, 46);
    const mx = Math.max(130, Math.min(this.cssW * 0.64, this.cssW - 190 - mw));
    const pbx = mx + mw + 10;
    const pbw = 9;

    // bar air (biru kehijauan) berbingkai putih
    ctx.fillStyle = '#ffffff';
    this.rrect(mx - 3, top - 3, mw + 6, mh + 6, 9);
    ctx.fill();
    const g = ctx.createLinearGradient(0, top, 0, top + mh);
    g.addColorStop(0, '#2b9aa8'); g.addColorStop(1, '#17657e');
    ctx.fillStyle = g;
    this.rrect(mx, top, mw, mh, 7);
    ctx.fill();

    // zona hijau muda
    const inZone = r.fishPos >= r.zone && r.fishPos <= r.zone + r.zoneH;
    const zt = ypx(r.zone + r.zoneH);
    const zh = (r.zoneH / 100) * inner;
    ctx.fillStyle = inZone ? '#9be8ae' : '#7fd195';
    this.rrect(mx + 3, zt, mw - 6, zh, 6);
    ctx.fill();
    ctx.strokeStyle = '#f2fff4';
    ctx.lineWidth = 2;
    ctx.stroke();

    // siluet ikan hitam
    const fy = ypx(r.fishPos);
    if (this.fish) {
      const anyCtx = ctx as CanvasRenderingContext2D & { filter?: string };
      const hasF = 'filter' in anyCtx;
      if (hasF) anyCtx.filter = 'brightness(0)';
      drawFish(ctx, this.fish.species, mx + mw / 2, fy, 0.5, 0, false);
      if (hasF) anyCtx.filter = 'none';
    }

    // bar kemajuan (kuning -> hijau)
    ctx.fillStyle = '#ffffff';
    this.rrect(pbx - 3, top - 3, pbw + 6, mh + 6, 8);
    ctx.fill();
    ctx.fillStyle = '#2c2a28';
    this.rrect(pbx, top, pbw, mh, 5);
    ctx.fill();
    const ph = (r.prog / 100) * inner;
    if (ph > 0) {
      ctx.fillStyle = r.prog < 45 ? '#f2c230' : '#4cc35a';
      this.rrect(pbx + 1.5, top + mh - pad - ph, pbw - 3, ph, 3);
      ctx.fill();
    }

    // label rarity di atas bar
    const sp = this.fish ? this.fish.species : null;
    if (sp) {
      const nm = sp.rarity.charAt(0).toUpperCase() + sp.rarity.slice(1);
      ctx.font = '700 12px "Pixelify Sans", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20,20,24,0.85)';
      ctx.strokeText(nm, mx + (mw + pbw + 10) / 2, top - 14);
      ctx.fillStyle = sp.rarity === 'common' ? '#ffffff' : RARITY[sp.rarity].color;
      ctx.fillText(nm, mx + (mw + pbw + 10) / 2, top - 14);

      // ucapan ikan di kiri bar
      const lines: Record<string, string> = {
        common: 'Baru belajar, jangan buru-buru malu.',
        uncommon: 'Lumayan, tapi belum cukup.',
        rare: 'Yakin sanggup menarikku?',
        epic: 'Jorannmu bisa patah!',
        legendary: 'Aku bukan ikan biasa!',
        mythic: 'Semua yang mencoba pulang kosong.',
        divine: 'Cahayaku bukan untuk sembarang pemancing.',
        secret: 'Tak ada yang pernah menarikku sampai ke darat.',
      };
      const text = lines[sp.rarity] || lines.common;
      const fs = 11;
      ctx.font = '700 ' + fs + 'px "Pixelify Sans", ui-monospace, monospace';
      const tw = ctx.measureText(text).width + 22;
      const cx2 = mx - 14 - tw / 2;
      this.pillText(text, cx2, fy, fs, '#fffdf7', '#2b2b2b', 11, 'rgba(60,60,60,0.35)');
      ctx.fillStyle = '#fffdf7';
      ctx.beginPath(); ctx.moveTo(mx - 15, fy - 4); ctx.lineTo(mx - 15, fy + 4); ctx.lineTo(mx - 7, fy); ctx.closePath(); ctx.fill();
    }
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private rrect(x: number, y: number, w: number, h: number, rad: number) {
    const c = this.ctx;
    const r = Math.min(rad, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
}
