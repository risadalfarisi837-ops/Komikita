'use client';

// Profil pemain Mancing (diketuk dari kartu pemain di kiri atas): statistik, ikan terbaik, Lemari (ganti baju), dan Title.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { BAG_MAX, MAX_LEVEL, RARITY, RODS, SPECIES_BY_ID, TITLES, formatNum, formatWeight, levelFromXp } from '@/lib/fishing';
import type { BagItem } from '@/lib/fishing';
import { FISH_H, FISH_W, drawFish, drawPlayer } from './art';
import type { Dir } from './art';
import { HATS, HAT_COLORS, HAIRS, PANTS, SHIRTS, SKINS, TOPS, palFromOutfit, randomOutfit, titleOf } from './outfit';
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
  dev: boolean;
  onSave: (o: Outfit) => void;
  onClose: () => void;
}

type View = 'profil' | 'lemari' | 'title';
type Tab = 'tubuh' | 'baju' | 'topi';

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
  const avScale = Math.max(2, Math.round(px(5)));

  const card: CSSProperties = { background: '#fff8e8', border: `${px(3)}px solid ${EDGE}`, borderRadius: px(20), boxShadow: `0 ${px(3)}px 0 #e0cb97`, boxSizing: 'border-box' };
  const btn = (on = false): CSSProperties => ({ border: `${px(2.5)}px solid ${on ? '#1f5fbf' : EDGE}`, background: on ? 'linear-gradient(180deg,#3d8ef2,#2069d2)' : 'linear-gradient(180deg,#fffdf4,#f6e9c6)', color: on ? '#fff' : BROWN, borderRadius: px(14), boxShadow: `0 ${px(3)}px 0 ${on ? '#1559b8' : '#e0cb97'}`, fontFamily: font, fontWeight: 800, fontSize: px(17), padding: `${px(9)}px ${px(12)}px`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: px(8) });
  const label = (t: string, extra?: ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', margin: `${px(10)}px 0 ${px(7)}px`, fontSize: px(17), fontWeight: 800 }}>
      <span style={{ flex: 1 }}>{t}</span>{extra}
    </div>
  );
  const lvPill = (
    <span style={{ background: '#1f4f9a', color: '#fff', fontWeight: 800, fontSize: px(15), borderRadius: 99, padding: `${px(2)}px ${px(10)}px`, border: `${px(2)}px solid #fff` }}>Lv <span style={{ fontSize: px(19) }}>{lv.level}</span></span>
  );
  const titlePill = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(5), background: '#dff0ff', border: `${px(2)}px solid #5b9be0`, color: '#1f4f9a', fontWeight: 800, fontSize: px(15), borderRadius: px(10), padding: `${px(2)}px ${px(10)}px` }}>🎖️ {title}</span>
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
  const count = (list: { lv: number }[]) => <span style={{ fontSize: px(14), fontWeight: 800, opacity: 0.7 }}>{list.filter((x) => open(x.lv)).length}/{list.length}</span>;

  const tabs: [Tab, string, string][] = [['tubuh', '🙂', 'Tubuh'], ['baju', '👕', 'Baju'], ['topi', '👒', 'Topi']];

  const header = (icon: string, text: string, back: () => void) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: px(16), background: 'linear-gradient(180deg,#3d8ef2,#2069d2)', padding: `${px(10)}px ${px(18)}px`, boxShadow: '0 4px 0 #1559b8', position: 'relative', zIndex: 2 }}>
      <span style={{ width: px(48), height: px(48), borderRadius: '50%', background: '#fff2d1', border: `${px(3)}px solid #fff`, boxShadow: '0 2px 0 rgba(0,0,60,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: px(26) }}>{icon}</span>
      <span style={{ color: '#fff', fontWeight: 800, fontSize: px(26), textShadow: '0 2px 0 rgba(0,0,60,0.35)' }}>{text}</span>
      <button onClick={back} aria-label="Tutup" style={{ marginLeft: 'auto', width: px(48), height: px(46), borderRadius: px(12), border: 0, background: '#e5484d', boxShadow: `0 ${px(4)}px 0 #a62a2f`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
        <svg width={px(26)} height={px(26)} viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
      </button>
    </div>
  );

  const shell = (head: ReactNode, body: ReactNode) => (
    <div onPointerDown={(e) => e.stopPropagation()} style={{ position: 'absolute', inset: 0, zIndex: 32, display: 'flex', flexDirection: 'column', background: '#fff5e1', fontFamily: font, color: BROWN }}>
      {head}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: px(14), padding: `${px(14)}px ${px(16)}px`, boxSizing: 'border-box' }}>{body}</div>
    </div>
  );

  // ================= PROFIL =================
  if (view === 'profil') {
    const chip = (icon: string, v: string) => (
      <div key={icon} style={{ ...card, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: px(8), padding: `${px(10)}px ${px(6)}px`, fontWeight: 800, fontSize: px(22) }}>
        <span style={{ fontSize: px(26) }}>{icon}</span>{v}
      </div>
    );
    return shell(
      header('🏆', 'Profil', p.onClose),
      <>
        <div style={{ ...card, width: px(270), flex: 'none', padding: px(12), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(6), overflowY: 'auto' }}>
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
          <div style={{ width: '100%', height: px(10), borderRadius: 99, background: '#eadfc4', overflow: 'hidden', marginTop: px(2) }}>
            <div style={{ width: pct + '%', height: '100%', background: 'linear-gradient(90deg,#2fbf8a,#6fdc8c)' }} />
          </div>
          <div style={{ fontSize: px(14), fontWeight: 800, opacity: 0.75 }}>{lv.level >= MAX_LEVEL ? 'Level maksimal' : `${formatNum(lv.into)}/${formatNum(lv.need)} XP`}</div>
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
          {label('Ikan terbaik di tas')}
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
        </div>
      </>,
    );
  }

  // ================= TITLE =================
  if (view === 'title') {
    const row = (key: string, text: string, need: number, on: boolean, pick: () => void) => {
      const ok = open(need);
      return (
        <button key={key} onClick={() => { if (ok) pick(); }} style={{ ...card, width: '100%', display: 'flex', alignItems: 'center', gap: px(10), padding: `${px(10)}px ${px(14)}px`, cursor: ok ? 'pointer' : 'default', fontFamily: font, color: BROWN, borderColor: on ? '#1f5fbf' : EDGE, background: ok ? '#fff8e8' : '#e3d6b6', textAlign: 'left' }}>
          <span style={{ fontSize: px(22) }}>{ok ? '🎖️' : '🔒'}</span>
          <span style={{ flex: 1, fontSize: px(18), fontWeight: 800, opacity: ok ? 1 : 0.55 }}>{text}</span>
          <span style={{ fontSize: px(14), fontWeight: 800, opacity: 0.7 }}>{need > 1 ? `Lv ${need}` : ''}</span>
          {on && <span style={{ background: '#2f9e44', color: '#fff', fontSize: px(13), fontWeight: 800, borderRadius: 99, padding: `${px(1)}px ${px(9)}px` }}>Dipakai</span>}
        </button>
      );
    };
    return shell(
      header('🏆', 'Title', () => setView('profil')),
      <>
        <div style={{ ...card, width: px(250), flex: 'none', padding: px(12), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(8) }}>
          {stage}
          <div style={{ fontSize: px(21), fontWeight: 800, textAlign: 'center' }}>{p.name}</div>
          {titlePill}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: px(8) }}>
          {row('auto', 'Otomatis (sesuai level)', 1, o.ttl < 0, () => set({ ttl: -1 }))}
          {TITLES.map(([need, text], i) => row(text, text, need, o.ttl === i && lv.level >= need, () => set({ ttl: i })))}
        </div>
      </>,
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
            {grid(SHIRTS.map((s, i) => swatch('o' + i, s.c, o.shirt === i, s.lv, () => set({ shirt: i }))))}
            {label('Kemeja', count(TOPS))}
            {grid(TOPS.map((s, i) => swatch('t' + i, s.c, o.top === i, s.lv, () => set({ top: i }))))}
            {label('Celana', count(PANTS))}
            {grid(PANTS.map((s, i) => swatch('c' + i, s.c, o.pants === i, s.lv, () => set({ pants: i }))))}
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
