import { TILE } from './art';

export const LEV_PERIOD = 20 * 60 * 1000;
export const LEV_DURATION = 8 * 60 * 1000;

export interface LevEvent {
  w: number;
  start: number;
  end: number;
}

export interface LevPoint {
  x: number;
  y: number;
  a?: number;
}

export interface LevPath {
  pts: LevPoint[];
  len: number;
  cum: number[];
}

export interface LevPose {
  x: number;
  y: number;
  angle: number;
  t: number;
}

export function levEventAt(nowMs: number): LevEvent | null {
  const w = Math.floor(nowMs / LEV_PERIOD);
  const start = w * LEV_PERIOD;
  const end = start + LEV_DURATION;
  if (nowMs >= start && nowMs < end) {
    return { w, start, end };
  }
  return null;
}

function isWaterTile(world: any, tx: number, ty: number): boolean {
  const tile = world?.tiles?.[ty]?.[tx];
  return tile === 'deep' || tile === 'shallow';
}

function isSegmentInWater(world: any, x0: number, y0: number, x1: number, y1: number): boolean {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(2, Math.ceil(dist / (TILE * 0.25)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (!isWaterTile(world, tx, ty)) return false;
  }
  return true;
}

export function buildLevPath(world: any): LevPath {
  const h = world?.tiles?.length ?? 0;
  const w = world?.tiles?.[0]?.length ?? 0;
  const waterCells: { tx: number; ty: number; x: number; y: number }[] = [];

  for (let ty = 1; ty < h - 1; ty++) {
    for (let tx = 1; tx < w - 1; tx++) {
      if (isWaterTile(world, tx, ty)) {
        // Prioritaskan tile air yang punya tetangga air di sekelilingnya agar aman dari tepi darat
        const safeNeighbors =
          (isWaterTile(world, tx + 1, ty) ? 1 : 0) +
          (isWaterTile(world, tx - 1, ty) ? 1 : 0) +
          (isWaterTile(world, tx, ty + 1) ? 1 : 0) +
          (isWaterTile(world, tx, ty - 1) ? 1 : 0);
        if (safeNeighbors >= 3) {
          waterCells.push({
            tx,
            ty,
            x: (tx + 0.5) * TILE,
            y: (ty + 0.5) * TILE,
          });
        }
      }
    }
  }

  const pool = waterCells.length >= 4 ? waterCells : (() => {
    const fallback: { tx: number; ty: number; x: number; y: number }[] = [];
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        if (isWaterTile(world, tx, ty)) {
          fallback.push({ tx, ty, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
        }
      }
    }
    return fallback;
  })();

  if (pool.length === 0) {
    const pts = [
      { x: 300, y: 300 },
      { x: 400, y: 300 },
      { x: 400, y: 400 },
      { x: 300, y: 400 },
    ];
    return { pts, len: 400, cum: [0, 100, 200, 300, 400] };
  }

  // Ambil sampel titik di sekitar outer/mid ring air lalu pastikan tiap segmen aman di air
  const cx = pool.reduce((s, p) => s + p.x, 0) / pool.length;
  const cy = pool.reduce((s, p) => s + p.y, 0) / pool.length;
  const sorted = [...pool].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
  );

  const step = Math.max(1, Math.floor(sorted.length / 48));
  const candidates: LevPoint[] = [];
  for (let i = 0; i < sorted.length; i += step) {
    candidates.push({ x: sorted[i].x, y: sorted[i].y });
  }

  const pts: LevPoint[] = [];
  for (const cand of candidates) {
    if (pts.length === 0) {
      pts.push(cand);
      continue;
    }
    const prev = pts[pts.length - 1];
    if (isSegmentInWater(world, prev.x, prev.y, cand.x, cand.y)) {
      pts.push(cand);
    }
  }

  if (pts.length >= 2 && isSegmentInWater(world, pts[pts.length - 1].x, pts[pts.length - 1].y, pts[0].x, pts[0].y)) {
    pts.push({ ...pts[0] });
  } else if (pts.length < 2) {
    const first = pool[0];
    pts.push({ x: first.x, y: first.y }, { x: first.x + TILE * 0.25, y: first.y }, { x: first.x, y: first.y });
  }

  const cum: number[] = [0];
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    cum.push(len);
  }

  return { pts, len: Math.max(len, 1), cum };
}

export function levPose(path: LevPath, ev: LevEvent, nowMs: number): LevPose {
  const elapsed = Math.max(0, nowMs - ev.start);
  const speedPxPerMs = 0.08;
  const dist = (elapsed * speedPxPerMs) % path.len;

  let idx = 0;
  while (idx < path.cum.length - 2 && path.cum[idx + 1] < dist) {
    idx++;
  }

  const segStart = path.cum[idx];
  const segEnd = path.cum[idx + 1] ?? segStart + 1;
  const frac = segEnd > segStart ? (dist - segStart) / (segEnd - segStart) : 0;

  const pA = path.pts[idx];
  const pB = path.pts[idx + 1] ?? pA;
  const x = pA.x + (pB.x - pA.x) * frac;
  const y = pA.y + (pB.y - pA.y) * frac;
  const angle = Math.atan2(pB.y - pA.y, pB.x - pA.x);

  return { x, y, angle, t: elapsed / 1000 };
}

export function levAlpha(ev: LevEvent, nowMs: number): number {
  const fadeMs = 10_000;
  if (nowMs <= ev.start || nowMs >= ev.end) return 0;
  const inAlpha = Math.min(1, (nowMs - ev.start) / fadeMs);
  const outAlpha = Math.min(1, (ev.end - nowMs) / fadeMs);
  return Math.max(0, Math.min(1, Math.min(inAlpha, outAlpha)));
}

export function levHit(pose: LevPose, px: number, py: number, radius = 48): boolean {
  return Math.hypot(px - pose.x, py - pose.y) <= radius;
}

export function drawLeviathan(
  ctx: CanvasRenderingContext2D,
  _world: any,
  pose: LevPose,
  alpha = 1,
  scale = 1,
  _camX = 0,
  _camY = 0,
  _vw = 0,
  _vh = 0
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#1b4965';
  ctx.beginPath();
  ctx.ellipse(0, 0, 36, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5fa8d3';
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.lineTo(-52, -14);
  ctx.lineTo(-46, 0);
  ctx.lineTo(-52, 14);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
