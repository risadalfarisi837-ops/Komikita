// Mesin game Mancing (tanpa React): gerak, lempar joran, tunggu gigitan, mini-game menarik ikan, dan render.
import { RARITY, rollFish } from '@/lib/fishing';
import type { Species } from '@/lib/fishing';
import {
  TILE, generateWorld, drawPlayer, drawPalm, drawRock, drawLamp, drawBobber, drawRipple, drawLine,
  drawBubbleAlert, drawFish, rodGeometry,
} from './art';
import type { Dir, World } from './art';

export type Phase = 'idle' | 'cast' | 'wait' | 'bite' | 'reel' | 'catching' | 'result';
export interface Catch { species: Species; weight: number }
export interface EngineEvents {
  onPhase?: (p: Phase) => void;
  onCatch?: (c: Catch) => void;
  onToast?: (m: string) => void;
  onBite?: () => void;
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
  private camX = 0;
  private camY = 0;
  private time = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private vignette: CanvasGradient | null = null;

  private target: Target | null = null;
  private castT = 0;
  private waitT = 0;
  private biteT = 0;
  private fish: Catch | null = null;
  private holding = false;
  private reel: Reel = { fishPos: 50, fishTarget: 50, tNext: 0, zone: 30, zoneV: 0, zoneH: 28, prog: 30, time: 0, diff: 1 };
  private catchT = 0;
  private reelRip = 0;
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
  setBagFull(b: boolean) { this.bagFull = b; }
  setMove(x: number, y: number) { this.joyX = x; this.joyY = y; }
  key(code: string, down: boolean) { if (down) this.keys.add(code); else this.keys.delete(code); }

  action(down: boolean) {
    if (this.phase === 'reel') { this.holding = down; return; }
    if (!down) return;
    if (this.phase === 'idle') this.tryCast();
    else if (this.phase === 'bite') this.hook();
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
    this.S = Math.max(2, Math.round(base / 176));
    const c = this.ctx;
    const g = c.createRadialGradient(this.canvas.width / 2, this.canvas.height / 2, Math.min(this.canvas.width, this.canvas.height) * 0.35, this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) * 0.75);
    g.addColorStop(0, 'rgba(0,10,30,0)');
    g.addColorStop(1, 'rgba(0,10,30,0.38)');
    this.vignette = g;
    this.snapCamera();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  // untuk pengujian
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

  private findTarget(): Target | null {
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
    const extra = 1 + Math.floor(Math.random() * 2);
    for (let k = 0; k < extra; k++) {
      const nx = tx + d.x;
      const ny = ty + d.y;
      if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h || !isWater(w.tiles[ny][nx])) break;
      tx = nx;
      ty = ny;
    }
    return { tx, ty, wx: (tx + 0.5) * TILE, wy: (ty + 0.5) * TILE };
  }

  private tryCast() {
    if (this.bagFull) { this.ev.onToast?.('Tas penuh! Jual ikan dulu.'); return; }
    const t = this.findTarget();
    if (!t) { this.ev.onToast?.('Hadapkan karakter ke air dulu'); return; }
    this.target = t;
    this.castT = 0;
    this.setPhase('cast');
  }

  private hook() {
    if (!this.fish) return;
    const diff = RARITY[this.fish.species.rarity].diff;
    this.reel = {
      fishPos: 50, fishTarget: 50, tNext: 0.5,
      zone: 36, zoneV: 0,
      zoneH: 27 + Math.min(10, this.level * 0.35),
      prog: 30, time: 0, diff,
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

    // fase mancing
    if (this.phase === 'cast') {
      this.castT += dt;
      if (this.castT >= 0.5 && this.target) {
        this.waitT = 2 + Math.random() * 5;
        this.ripples.push({ x: this.target.wx, y: this.target.wy, t: 0 });
        this.splash(this.target.wx, this.target.wy, 8);
        this.setPhase('wait');
      }
    } else if (this.phase === 'wait' && this.target) {
      this.waitT -= dt;
      if (Math.random() < dt * 0.7) this.ripples.push({ x: this.target.wx + (Math.random() - 0.5) * 6, y: this.target.wy + (Math.random() - 0.5) * 3, t: 0.55 });
      if (this.waitT <= 0) {
        this.fish = rollFish(this.level, this.luck);
        this.biteT = 1.25;
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
    r.prog = clamp(r.prog + (inZone ? 24 : -(12 + 6 * r.diff)) * dt, 0, 100);

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
      drawBobber(ctx, bx, by, dip);
      by += dip;
    } else if (tg && ph === 'cast') {
      const k = Math.min(1, this.castT / 0.5);
      bx = geo.tx + (tg.wx - geo.tx) * k;
      by = geo.ty + (tg.wy - geo.ty) * k - Math.sin(k * Math.PI) * 16;
      showBobber = true;
      drawBobber(ctx, bx, by, 0);
    } else if (tg && ph === 'reel') {
      bx = tg.wx; by = tg.wy;
    }

    // objek berurutan menurut y
    type Ent = { y: number; f: () => void };
    const ents: Ent[] = [];
    for (const p of w.props) {
      const bxp = p.x * TILE;
      const byp = p.y * TILE;
      if (bxp < vx0 - 30 || bxp > vx0 + vw + 30 || byp < vy0 - 8 || byp > vy0 + vh + 40) continue;
      if (p.kind === 'palm') ents.push({ y: byp + 15, f: () => drawPalm(ctx, p, t) });
      else if (p.kind === 'rock') ents.push({ y: byp + 13, f: () => drawRock(ctx, p) });
      else ents.push({ y: byp + 15, f: () => drawLamp(ctx, p, t) });
    }
    ents.push({ y: this.py, f: () => drawPlayer(ctx, this.px, this.py, this.dir, this.moving, this.stepT, rod, shake) });
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) e.f();

    // tali pancing
    if (rod && tg && ph !== 'catching') {
      const sag = ph === 'reel' ? 2 : ph === 'cast' ? 4 : 7 + Math.sin(t * 2) * 1.2;
      drawLine(ctx, geo.tx, geo.ty, bx, by - (showBobber ? 3 : 0), sag);
    }
    if (ph === 'bite') drawBubbleAlert(ctx, this.px, this.py - 24, t);

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
    if (ph === 'reel') this.drawMeter();
  }

  private drawMeter() {
    const ctx = this.ctx;
    const r = this.reel;
    const d = this.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const topOff = this.cssH < 500 ? 78 : 118;
    const avail = this.cssH - topOff - 150;
    const mh = clamp(avail, 120, 280);
    const top = topOff + Math.max(0, (avail - mh) / 2);
    const mw = 36;
    const mx = this.cssW - 58 - mw / 2;
    const pad = 4;
    const inner = mh - pad * 2;
    const ypx = (pos: number) => top + mh - pad - (pos / 100) * inner;

    // bar kemajuan (kiri meter)
    const pw = 9;
    const px0 = mx - pw - 8;
    ctx.fillStyle = 'rgba(8,16,32,0.8)';
    this.rrect(px0 - 2, top, pw + 4, mh, 6);
    ctx.fill();
    const pc = r.prog > 66 ? '#4ade80' : r.prog > 33 ? '#facc15' : '#f87171';
    ctx.fillStyle = pc;
    const ph = (r.prog / 100) * inner;
    this.rrect(px0, top + mh - pad - ph, pw, Math.max(0, ph), 4);
    ctx.fill();

    // meter utama
    const g = ctx.createLinearGradient(0, top, 0, top + mh);
    g.addColorStop(0, '#1d4f7a');
    g.addColorStop(1, '#0d2b4a');
    ctx.fillStyle = g;
    this.rrect(mx, top, mw, mh, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const inZone = r.fishPos >= r.zone && r.fishPos <= r.zone + r.zoneH;
    const zt = ypx(r.zone + r.zoneH);
    const zh = (r.zoneH / 100) * inner;
    ctx.fillStyle = inZone ? 'rgba(74,222,128,0.65)' : 'rgba(74,222,128,0.4)';
    this.rrect(mx + 3, zt, mw - 6, zh, 6);
    ctx.fill();
    ctx.strokeStyle = inZone ? '#bbf7d0' : '#4ade80';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (this.fish) drawFish(ctx, this.fish.species, mx + mw / 2, ypx(r.fishPos), 0.55 * 1, 0, false);
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
