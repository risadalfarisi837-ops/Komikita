'use client';
import type React from 'react';

// Profil pemain Mancing (diketuk dari kartu pemain di kiri atas): statistik, ikan terbaik, Lemari (ganti baju), dan Title.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { BAG_MAX, MAX_LEVEL, RARITY, RODS, SPECIES_BY_ID, TITLES, formatNum, formatWeight, levelFromXp } from '@/lib/fishing';
import type { BagItem } from '@/lib/fishing';
import { FISH_H, FISH_W, drawFish, drawPlayer } from './art';
import type { Dir } from './art';
import { HATS, HAT_COLORS, HAIRS, LIMITED_OUTFITS, PANTS, SHIRTS, SKINS, TOPS, palFromOutfit, randomOutfit, titleOf } from './outfit';
import type { Outfit } from './outfit';

interface Props {
  px: (n: number) => number;
  font: string;
  name: string;
  photo: string;
  xp: number;
  crystal: number;
  bag: BagItem[];
  rods: string[];
  outfit: Outfit;
  /** Baju dari Gacha Baju Limited yang dimiliki ('night' | 'flame'). */
  limitedOwned?: string[];
  dev: boolean;
  onSave: (o: Outfit) => void;
  onClose: () => void;
}

type View = 'profil' | 'lemari' | 'title';
type Tab = 'tubuh' | 'baju' | 'topi' | 'limited';

const BROWN = '#5a3b1e';
const EDGE = '#ead9b0';
const DIRS: Dir[] = ['down', 'left', 'up', 'right'];

// Karakter pemain digambar pakai mesin yang sama dengan di game, jadi persis sama.
function Avatar({ outfit, dir, scale }: { outfit: Outfit; dir: Dir; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    drawPlayer(ctx, 20, 33, dir, false, 0, false, 0, palFromOutfit(outfit));
  }, [outfit, dir]);
  return <canvas ref={ref} width={40} height={40} style={{ width: 40 * scale, height: 40 * scale, imageRendering: 'pixelated', display: 'block' }} />;
}

function FishCanvas({ id, scale }: { id: string; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const sp = SPECIES_BY_ID[id];
    const ctx = c?.getContext('2d');
    if (!c || !sp || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    drawFish(ctx, sp, c.width / 2, c.height / 2, 1);
  }, [id]);
  return <canvas ref={ref} width={FISH_W} height={FISH_H} style={{ width: FISH_W * scale, height: FISH_H * scale, imageRendering: 'pixelated' }} />;
}

type IconKind = 'overall' | 'kemeja' | 'celana';
const ICON_LINE = '#14110f';
function darkenHex(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - f))));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('');
}
// Ikon pixel-art pakaian (kemeja / overall / celana) untuk kartu item di Lemari > Baju.
function ItemIcon({ kind, color, size, dim }: { kind: IconKind; color: string; size: number; dim: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 16, 16);
    ctx.imageSmoothingEnabled = false;
    const d = darkenHex(color, 0.22);
    const dd = darkenHex(color, 0.4);
    type Rc = [number, number, number, number, string];
    let rects: Rc[];
    if (kind === 'kemeja') {
      rects = [[4, 4, 8, 9, color], [2, 4, 2, 4, color], [12, 4, 2, 4, color], [2, 7, 2, 1, d], [12, 7, 2, 1, d], [6, 4, 4, 1, dd], [4, 11, 8, 2, d], [7, 5, 2, 5, d]];
    } else if (kind === 'overall') {
      rects = [[4, 6, 8, 7, color], [5, 2, 2, 5, color], [9, 2, 2, 5, color], [6, 8, 4, 2, d], [4, 12, 8, 1, dd], [5, 6, 1, 1, dd], [10, 6, 1, 1, dd]];
    } else {
      rects = [[4, 2, 8, 2, d], [4, 4, 8, 4, color], [4, 8, 3, 6, color], [9, 8, 3, 6, color], [7, 4, 2, 4, d], [4, 12, 3, 2, d], [9, 12, 3, 2, d]];
    }
    ctx.fillStyle = ICON_LINE;
    rects.forEach(([x, y, w, h]) => ctx.fillRect(x - 1, y - 1, w + 2, h + 2));
    rects.forEach(([x, y, w, h, c]) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); });
  }, [kind, color]);
  return <canvas ref={ref} width={16} height={16} style={{ width: size, height: size, imageRendering: 'pixelated', display: 'block', opacity: dim ? 0.4 : 1 }} />;
}

export default function ProfileModal(p: Props) {
  const { px, font } = p;
  const [view, setView] = useState<View>('profil');
  const [tab, setTab] = useState<Tab>('tubuh');
  const [dir, setDir] = useState<Dir>('down');
  const lv = levelFromXp(p.xp);
  const o = p.outfit;
  const open = (need: number) => p.dev || lv.level >= need;
  const set = (patch: Partial<Outfit>) => p.onSave({ ...o, ...patch });
  const title = titleOf(lv.level, o.ttl);
  const best = [...p.bag].sort((a, b) => b.w - a.w).slice(0, 4);
  const pct = lv.level >= MAX_LEVEL ? 100 : Math.min(100, (lv.into / Math.max(1, lv.need)) * 100);
  const styleLists = [SKINS, HAIRS, SHIRTS, TOPS, PANTS, HATS, HAT_COLORS];
  const koleksi: [string, string, number, number][] = [
    ['🎣', 'Rod', p.rods.length, RODS.length],
    ['👕', 'Gaya', styleLists.reduce((n, l) => n + l.filter((x) => open(x.lv)).length, 0), styleLists.reduce((n, l) => n + l.length, 0)],
  ];
  const avScale = Math.max(2, Math.round(px(5)));

  const card: CSSProperties = { background: '#fff8e8', border: `${px(3)}px solid ${EDGE}`, borderRadius: px(20), boxShadow: `0 ${px(3)}px 0 #e0cb97`, boxSizing: 'border-box' };
  const btn = (on = false): CSSProperties => ({ border: `${px(2.5)}px solid ${on ? '#1f5fbf' : EDGE}`, background: on ? 'linear-gradient(180deg,#3d8ef2,#2069d2)' : 'linear-gradient(180deg,#fffdf4,#f6e9c6)', color: on ? '#fff' : BROWN, borderRadius: px(14), boxShadow: `0 ${px(3)}px 0 ${on ? '#1559b8' : '#e0cb97'}`, fontFamily: font, fontWeight: 800, fontSize: px(17), padding: `${px(9)}px ${px(12)}px`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: px(8) });
  const label = (t: string, extra?: ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', margin: `${px(6)}px 0 ${px(2)}px`, fontSize: px(15), fontWeight: 800 }}>
      <span style={{ flex: 1 }}>{t}</span>{extra}
    </div>
  );
  const lvPill = (
    <span style={{ background: '#1f4f9a', color: '#fff', fontWeight: 800, fontSize: px(15), borderRadius: 99, padding: `${px(2)}px ${px(10)}px`, border: `${px(2)}px solid #fff` }}>Lv <span style={{ fontSize: px(19) }}>{lv.level}</span></span>
  );
  const titlePill = (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: px(6), background: 'linear-gradient(180deg,#eef7ff,#cfe6ff)', border: `${px(2)}px solid #7fb0ea`, color: '#1f4f9a', fontWeight: 800, fontSize: px(15), borderRadius: px(99), padding: `${px(2)}px ${px(16)}px`, boxShadow: '0 2px 0 #9cc4ee' }}>✦ {title} ✦</span>
  );
  const rotate = () => setDir((d) => DIRS[(DIRS.indexOf(d) + 1) % DIRS.length]);
  const stage = (
    <button onClick={rotate} aria-label="Putar karakter" style={{ position: 'relative', border: 0, width: '100%', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', padding: `${px(10)}px 0 ${px(4)}px`, borderRadius: px(16), background: 'linear-gradient(180deg,#bfe6ff 0%,#e9f7ff 64%,#f1d994 64%,#e6c57a 100%)' }}>
      <Avatar outfit={o} dir={dir} scale={avScale} />
    </button>
  );

  // ----- swatch warna / pilihan -----
  const swatch = (key: string, color: string, on: boolean, need: number, pick: () => void) => {
    const ok = open(need);
    return (
      <button key={key} onClick={() => { if (ok) pick(); }} aria-label={ok ? 'Pilih' : `Terkunci, butuh level ${need}`} style={{ position: 'relative', width: px(66), height: px(66), padding: 0, borderRadius: px(14), cursor: ok ? 'pointer' : 'default', background: ok ? '#fffdf4' : '#e3d6b6', border: `${px(3.5)}px solid ${on ? '#1f5fbf' : EDGE}`, boxShadow: on ? '0 0 0 2px #9cc4ff' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: px(36), height: px(36), borderRadius: '50%', background: color, border: `${px(2)}px solid rgba(0,0,0,.28)`, opacity: ok ? 1 : 0.4 }} />
        {on && <span style={{ position: 'absolute', top: px(-7), right: px(-7), width: px(22), height: px(22), borderRadius: '50%', background: '#2f9e44', color: '#fff', fontSize: px(14), fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `${px(2)}px solid #fff` }}>✓</span>}
        {!ok && <span style={{ position: 'absolute', bottom: px(2), left: 0, right: 0, textAlign: 'center', fontSize: px(11), fontWeight: 800, color: '#7a6a45' }}>🔒 Lv{need}</span>}
      </button>
    );
  };
  const grid = (kids: ReactNode) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(10) }}>{kids}</div>;
  const itemGrid = (kids: ReactNode) => <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${px(62)}px, 1fr))`, gap: px(8) }}>{kids}</div>;
  const itemTile = (key: string, kind: IconKind, color: string, on: boolean, need: number, pick: () => void) => {
    const ok = open(need);
    return (
      <button key={key} onClick={() => { if (ok) pick(); }} aria-label={ok ? 'Pilih' : `Terkunci, butuh level ${need}`} style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', padding: 0, borderRadius: px(14), cursor: ok ? 'pointer' : 'default', background: ok ? '#fffdf4' : '#e3d6b6', border: `${px(3.5)}px solid ${on ? '#1f5fbf' : EDGE}`, boxShadow: on ? '0 0 0 2px #9cc4ff' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ItemIcon kind={kind} color={color} size={px(42)} dim={!ok} />
        {on && <span style={{ position: 'absolute', top: px(-7), right: px(-7), width: px(22), height: px(22), borderRadius: '50%', background: '#2f9e44', color: '#fff', fontSize: px(14), fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `${px(2)}px solid #fff` }}>✓</span>}
        {!ok && <span style={{ position: 'absolute', bottom: px(2), left: 0, right: 0, textAlign: 'center', fontSize: px(11), fontWeight: 800, color: '#7a6a45' }}>🔒 Lv{need}</span>}
      </button>
    );
  };
  const count = (list: { lv: number }[]) => <span style={{ fontSize: px(14), fontWeight: 800, opacity: 0.7 }}>{list.filter((x) => open(x.lv)).length}/{list.length}</span>;

  const tabs: [Tab, string, string][] = [['tubuh', '🙂', 'Tubuh'], ['baju', '👕', 'Baju'], ['topi', '👒', 'Topi'], ['limited', '✨', 'Limited']];

  const header = (icon: string, text: string, back: () => void) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: px(16), background: 'linear-gradient(180deg,#3d8ef2,#2069d2)', padding: `${px(6)}px ${px(14)}px`, boxShadow: '0 3px 0 #1559b8', position: 'relative', zIndex: 2 }}>
      <span style={{ width: px(42), height: px(42), borderRadius: '50%', background: '#fff2d1', border: `${px(3)}px solid #fff`, boxShadow: '0 2px 0 rgba(0,0,60,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: px(26) }}>{icon}</span>
      <span style={{ color: '#fff', fontWeight: 800, fontSize: px(24), textShadow: '0 2px 0 rgba(0,0,60,0.35)' }}>{text}</span>
      <button onClick={back} aria-label="Tutup" style={{ marginLeft: 'auto', width: px(46), height: px(42), borderRadius: px(12), border: 0, background: '#e5484d', boxShadow: `0 ${px(4)}px 0 #a62a2f`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
        <svg width={px(26)} height={px(26)} viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
      </button>
    </div>
  );

  const shell = (head: ReactNode, body: ReactNode) => (
    <div onPointerDown={(e) => e.stopPropagation()} style={{ position: 'absolute', inset: 0, zIndex: 32, background: 'rgba(0,0,0,.55)', padding: px(14), boxSizing: 'border-box', fontFamily: font, color: BROWN }}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff5e1', border: `${px(4)}px solid #1f5fbf`, borderRadius: px(22), overflow: 'hidden', boxSizing: 'border-box' }}>
        {head}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: px(12), padding: `${px(12)}px ${px(14)}px`, boxSizing: 'border-box' }}>{body}</div>
      </div>
    </div>
  );

  // ================= PROFIL =================
  if (view === 'profil') {
    const chip = (icon: string, v: string) => (
      <div key={icon} style={{ ...card, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: px(8), padding: `${px(7)}px ${px(6)}px`, fontWeight: 800, fontSize: px(21), borderRadius: px(16) }}>
        <span style={{ fontSize: px(24) }}>{icon}</span>{v}
      </div>
    );
    return shell(
      header('🏆', 'Profil', p.onClose),
      <>
        <div style={{ ...card, width: px(250), flex: 'none', padding: px(10), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(5), overflowY: 'auto' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            {stage}
            <span style={{ position: 'absolute', top: px(8), left: px(8) }}>{lvPill}</span>
            {p.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo} alt="" referrerPolicy="no-referrer" style={{ position: 'absolute', top: px(8), right: px(8), width: px(38), height: px(38), borderRadius: '50%', objectFit: 'cover', border: `${px(2.5)}px solid #fff`, boxShadow: '0 2px 0 rgba(0,0,0,.2)' }} />
            ) : null}
          </div>
          <div style={{ fontSize: px(22), fontWeight: 800, lineHeight: 1.15, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
          {titlePill}
          <div style={{ width: '100%', height: px(12), borderRadius: 99, background: '#eadfc4', overflow: 'hidden', marginTop: px(2), border: `${px(1.5)}px solid #d9c690`, boxSizing: 'border-box' }}>
            <div style={{ width: pct + '%', height: '100%', background: 'linear-gradient(180deg,#7be06a,#3fb84a)' }} />
          </div>
          <div style={{ fontSize: px(14), fontWeight: 800, opacity: 0.8, marginBottom: px(4) }}>{lv.level >= MAX_LEVEL ? 'Level maksimal' : `${formatNum(lv.into)}/${formatNum(lv.need)} XP`}</div>
          <div style={{ display: 'flex', gap: px(8), width: '100%', marginTop: 'auto' }}>
            <button onClick={() => setView('lemari')} style={{ ...btn(), flex: 1 }}>👕 Lemari</button>
            <button onClick={() => setView('title')} style={{ ...btn(), flex: 1 }}>🏆 Title</button>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: px(10) }}>
          <div style={{ display: 'flex', gap: px(10) }}>
            {chip('🎒', `${p.bag.length}/${BAG_MAX}`)}
            {chip('🎣', `${p.rods.length}/${RODS.length}`)}
            {chip('✨', formatNum(p.xp))}
            {chip('💎', formatNum(p.crystal))}
          </div>
          {label('Ikan terbaik')}
          {best.length === 0 ? (
            <div style={{ ...card, padding: px(18), textAlign: 'center', fontWeight: 700, opacity: 0.7, fontSize: px(16) }}>Tas masih kosong. Tangkap ikan dulu!</div>
          ) : (
            <div style={{ display: 'flex', gap: px(10) }}>
              {best.map((b, i) => {
                const sp = SPECIES_BY_ID[b.s];
                if (!sp) return null;
                const col = RARITY[sp.rarity].color;
                return (
                  <div key={b.id} style={{ ...card, flex: 1, minWidth: 0, padding: px(8), borderColor: col, textAlign: 'center', position: 'relative' }}>
                    {i === 0 && <span style={{ position: 'absolute', top: px(-9), left: '50%', transform: 'translateX(-50%)', background: '#1f4f9a', color: '#fff', fontSize: px(12), fontWeight: 800, borderRadius: 99, padding: `0 ${px(10)}px`, whiteSpace: 'nowrap' }}>Terberat</span>}
                    <div style={{ background: '#16386b', borderRadius: px(12), height: px(76), display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: px(5) }}>
                      <FishCanvas id={sp.id} scale={Math.max(1, px(2.2))} />
                    </div>
                    <div style={{ fontSize: px(15), fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.name}</div>
                    <div style={{ fontSize: px(14), fontWeight: 700, opacity: 0.75 }}>{formatWeight(b.w)}</div>
                  </div>
                );
              })}
            </div>
          )}
          {label('Koleksi')}
          <div style={{ display: 'flex', gap: px(8) }}>
            <span style={{ ...btn(true), padding: `${px(7)}px ${px(16)}px`, fontSize: px(16) }}>🏝️ Rumah</span>
          </div>
          <div style={{ ...card, padding: `${px(10)}px ${px(14)}px`, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: px(22), rowGap: px(10) }}>
            {koleksi.map(([ic, nm, got, tot]) => (
              <div key={nm} style={{ display: 'flex', alignItems: 'center', gap: px(8), minWidth: 0 }}>
                <span style={{ fontSize: px(22), width: px(28), textAlign: 'center' }}>{ic}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: px(15), fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}><span>{nm}</span><span>{got}/{tot}</span></div>
                  <div style={{ height: px(8), borderRadius: 99, background: '#eadfc4', overflow: 'hidden' }}>
                    <div style={{ width: Math.min(100, (got / Math.max(1, tot)) * 100) + '%', height: '100%', background: '#1f6fd0', borderRadius: 99 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>,
    );
  }

  // ================= GELAR (Title) =================
  if (view === 'title') {
    const RAR: [string, string, string, string][] = [
      ['Common', '#d8dde3', '#8d96a3', '#aeb7c2'], ['Rare', '#bfe0ff', '#4a90d9', '#7fb6ec'], ['Rare', '#bfe0ff', '#4a90d9', '#7fb6ec'],
      ['Epic', '#e4d3ff', '#8b5cd6', '#b995ee'], ['Epic', '#e4d3ff', '#8b5cd6', '#b995ee'], ['Legendary', '#ffe7a3', '#d19a1f', '#eec55a'], ['Mythic', '#ffc4c4', '#d94a4a', '#ee8a8a'],
    ];
    const idx = o.ttl >= 0 && lv.level >= (TITLES[o.ttl]?.[0] ?? 99) ? o.ttl : TITLES.findIndex(([n], i) => lv.level >= n && !(TITLES[i + 1] && lv.level >= TITLES[i + 1][0]));
    const cur = Math.max(0, idx);
    // tema plakat: [atas, tengah, bawah, warna teks]
    const THEME: [string, string, string, string][] = [
      ['#ffffff', '#e1e6eb', '#8f9ba8', '#2b3440'], ['#ffffff', '#d3eaff', '#5f9fd6', '#0f3b5e'], ['#ffffff', '#d3eaff', '#5f9fd6', '#0f3b5e'],
      ['#ffffff', '#eadcff', '#9a74d6', '#3b1f66'], ['#ffffff', '#eadcff', '#9a74d6', '#3b1f66'], ['#fff7d1', '#ffe08a', '#d19a1f', '#5a3a00'], ['#ffe9e9', '#ffb3b3', '#d95a5a', '#6b1414'],
    ];
    const LOCKED: [string, string, string, string] = ['#e6e6ec', '#b3b3be', '#6d6d79', '#26262e'];
    const OUT = '#1c1c2a';
    const plaque = (text: string, lock: boolean, r: number, size = 15) => {
      const th = lock ? LOCKED : THEME[Math.min(r, THEME.length - 1)];
      const ornate = lock || size >= 20;
      const h = px(size * 1.45);
      const bar: React.CSSProperties = {
        padding: `${px(size * 0.12)}px ${px(ornate ? size * 1.0 : size * 0.9)}px`, fontWeight: 900, fontSize: px(size), color: th[3], whiteSpace: 'nowrap',
        background: `linear-gradient(180deg,${th[0]} 0%,${th[1]} 55%,${th[2]} 100%)`, border: `${px(2)}px solid ${OUT}`, borderRadius: ornate ? px(3) : px(7),
        boxShadow: '0 2px 0 rgba(0,0,0,.35)', textShadow: '0 1px 0 rgba(255,255,255,.7)', position: 'relative', zIndex: 0,
      };
      if (!ornate) return <span style={bar}>{text}</span>;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <svg width={h} height={h} viewBox="0 0 24 24" style={{ marginRight: -px(size * 0.4), zIndex: 1, flex: 'none' }}>
            <polygon points="12,1 23,12 12,23 1,12" fill={th[1]} stroke={OUT} strokeWidth="1.8" />
            <polygon points="12,5 14,10 19,12 14,14 12,19 10,14 5,12 10,10" fill="#fff" />
            <circle cx="12" cy="12" r="1.7" fill={th[2]} />
          </svg>
          <span style={bar}>{text}</span>
          <svg width={h * 1.15} height={h} viewBox="0 0 28 24" style={{ marginLeft: -px(size * 0.3), zIndex: 1, flex: 'none' }}>
            <path d="M2,14 L14,2 L18,6 L8,16Z" fill={th[1]} stroke={OUT} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M4,18 L20,8 L25,12 L10,21Z" fill={th[0]} stroke={OUT} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M9,23 L22,15 L27,19 L15,24Z" fill={th[2]} stroke={OUT} strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </span>
      );
    };
    const gcard = (key: string, text: string, need: number, rIdx: number, desc: string, on: boolean, pick: () => void) => {
      const ok = open(need);
      const pct2 = Math.min(100, (lv.level / Math.max(1, need)) * 100);
      return (
        <button key={key} onClick={() => { if (ok) pick(); }} style={{ background: '#f7ebcc', border: `${px(3)}px solid ${on ? '#1f5fbf' : 'transparent'}`, borderRadius: px(18), padding: `${px(12)}px ${px(12)}px`, minHeight: px(96), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: ok ? 'center' : 'flex-start', gap: px(7), cursor: ok ? 'pointer' : 'default', fontFamily: font, color: BROWN, boxSizing: 'border-box' }}>
          {plaque(text, !ok, rIdx, ok ? 13 : 15)}
          {!ok && (
            <>
              <span style={{ display: 'flex', alignItems: 'flex-start', gap: px(5), fontSize: px(13), fontWeight: 700, textAlign: 'center', lineHeight: 1.25 }}>
                <span style={{ fontSize: px(12) }}>🔒</span><span>{desc}</span>
              </span>
              <span style={{ width: '100%', display: 'flex', alignItems: 'center', gap: px(8), marginTop: 'auto' }}>
                <span style={{ flex: 1, height: px(6), borderRadius: 99, background: '#e6d8b0', overflow: 'hidden' }}>
                  <span style={{ display: 'block', width: pct2 + '%', height: '100%', background: '#1f6fd0', borderRadius: 99 }} />
                </span>
                <span style={{ fontSize: px(12), fontWeight: 800, opacity: 0.75 }}>{lv.level}/{need}</span>
              </span>
            </>
          )}
        </button>
      );
    };
    return shell(
      header('🏆', 'Gelar', () => setView('profil')),
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: px(12) }}>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: px(24), padding: `${px(14)}px ${px(22)}px`, borderRadius: px(18), background: 'linear-gradient(180deg,#17407f,#0e2a5a)', border: `${px(2)}px solid #0b2350`, boxShadow: '0 3px 0 #0b2350', color: '#fff' }}>
          {plaque(title, false, cur, 24)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
            <span style={{ fontSize: px(18), fontWeight: 800, color: '#d9c8ff' }}>{RAR[Math.min(cur, RAR.length - 1)][0]}</span>
            <span style={{ fontSize: px(16), fontWeight: 800 }}>✓ Dipakai</span>
            <span style={{ fontSize: px(15), fontWeight: 700 }}>{o.ttl < 0 ? 'Otomatis sesuai level' : `Capai Level ${TITLES[cur][0]}`}</span>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: px(12), alignContent: 'start', paddingRight: px(4) }}>
          {gcard('auto', 'Otomatis', 1, 0, 'Gelar mengikuti level kamu', o.ttl < 0, () => set({ ttl: -1 }))}
          {TITLES.map(([need, text], i) => gcard(text, text, need, i, `Capai Level ${need}`, o.ttl === i && lv.level >= need, () => set({ ttl: i })))}
        </div>
      </div>,
    );
  }

  // ================= LEMARI =================
  return shell(
    header('👕', 'Lemari', () => setView('profil')),
    <>
      <div style={{ ...card, width: px(130), flex: 'none', padding: px(8), display: 'flex', flexDirection: 'column', gap: px(8) }}>
        {tabs.map(([k, ic, t]) => (
          <button key={k} onClick={() => setTab(k)} style={{ ...btn(tab === k), justifyContent: 'flex-start', padding: `${px(10)}px ${px(10)}px` }}><span style={{ fontSize: px(20) }}>{ic}</span>{t}</button>
        ))}
      </div>
      <div style={{ ...card, width: px(230), flex: 'none', padding: px(12), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(8) }}>
        {stage}
        <div style={{ fontSize: px(20), fontWeight: 800, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
        <div style={{ fontSize: px(12), fontWeight: 700, opacity: 0.6 }}>Ketuk karakter untuk memutar</div>
        <button onClick={() => p.onSave(randomOutfit(lv.level, p.dev, o))} style={{ ...btn(), width: '100%', marginTop: 'auto' }}>🎲 Cari gaya baru</button>
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingRight: px(6) }}>
        {tab === 'tubuh' && (
          <>
            {label('Warna kulit', count(SKINS))}
            {grid(SKINS.map((s, i) => swatch('s' + i, s.c, o.skin === i, s.lv, () => set({ skin: i }))))}
            {label('Warna rambut', count(HAIRS))}
            {grid(HAIRS.map((s, i) => swatch('h' + i, s.c, o.hair === i, s.lv, () => set({ hair: i }))))}
          </>
        )}
        {tab === 'baju' && (
          <>
            {label('Overall', count(SHIRTS))}
            {itemGrid(SHIRTS.map((s, i) => itemTile('o' + i, 'overall', s.c, o.shirt === i, s.lv, () => set({ shirt: i }))))}
            {label('Kemeja', count(TOPS))}
            {itemGrid(TOPS.map((s, i) => itemTile('t' + i, 'kemeja', s.c, o.top === i, s.lv, () => set({ top: i }))))}
            {label('Celana', count(PANTS))}
            {itemGrid(PANTS.map((s, i) => itemTile('c' + i, 'celana', s.c, o.pants === i, s.lv, () => set({ pants: i }))))}
          </>
        )}
        {tab === 'limited' && (
          <>
            {label('Baju Limited', <span style={{ fontSize: px(13), opacity: 0.6 }}>dari Gacha Baju Limited</span>)}
            <div style={{ display: 'flex', gap: px(10), flexWrap: 'wrap' }}>
              <button onClick={() => set({ limited: 0 })} style={btn(o.limited === 0)}>Lepas baju limited</button>
              {LIMITED_OUTFITS.map((l, i) => {
                const ok = p.dev || (p.limitedOwned ?? []).includes(l.key);
                return (
                  <button key={l.key} onClick={() => { if (ok) set({ limited: i + 1 }); }} style={{ ...btn(o.limited === i + 1), opacity: ok ? 1 : 0.55, cursor: ok ? 'pointer' : 'default' }}>{ok ? '' : '🔒 '}{l.name}</button>
                );
              })}
            </div>
            {!(p.limitedOwned ?? []).length && !p.dev && <div style={{ marginTop: px(10), fontSize: px(14), fontWeight: 700, color: '#8a6d4a' }}>Belum punya baju limited. Buka peti di Toko &gt; Baju Limited.</div>}
          </>
        )}
        {tab === 'topi' && (
          <>
            {label('Model topi', count(HATS))}
            <div style={{ display: 'flex', gap: px(10), flexWrap: 'wrap' }}>
              {HATS.map((h, i) => {
                const ok = open(h.lv);
                return (
                  <button key={h.n} onClick={() => { if (ok) set({ hat: i }); }} style={{ ...btn(o.hat === i), opacity: ok ? 1 : 0.55, cursor: ok ? 'pointer' : 'default' }}>{ok ? '' : '🔒 '}{h.n}{ok ? '' : ` Lv${h.lv}`}</button>
                );
              })}
            </div>
            {label('Warna topi', count(HAT_COLORS))}
            <div style={{ opacity: o.hat === 0 ? 0.45 : 1 }}>
              {grid(HAT_COLORS.map((s, i) => swatch('k' + i, s.c, o.hatCol === i, s.lv, () => set({ hatCol: i }))))}
            </div>
          </>
        )}
      </div>
    </>,
  );
}
