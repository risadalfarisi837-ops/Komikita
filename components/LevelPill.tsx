'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import TierIcon from '@/components/TierIcon';
import { ADMIN_TIER, TIERS, nextTier, nf, rangeText, tierFor } from '@/lib/levelTiers';
import type { LevelTier } from '@/lib/levelTiers';

const EVT = 'komikita:level-sheet';
/** Buka lembar "Semua Tier Level" untuk level tertentu (dipakai di mana saja). */
export const openLevelSheet = (level: number) => {
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: { level } })); } catch {}
};

// Pil berwarna sesuai tier (ikon + teks). shine = kilau menyapu (mulai tier Gold), kerlip bintang (mulai tier Eternal)
export function TierPill({ tier, text, fontSize = '12px', iconSize = 13, style, shine, delay = 0 }: { tier: LevelTier; text: string; fontSize?: string; iconSize?: number; style?: CSSProperties; shine?: boolean; delay?: number }) {
  const idx = TIERS.indexOf(tier);
  const isAdm = tier.key === 'admin';
  const sweep = !!shine && (idx >= 3 || isAdm);
  const twinkle = !!shine && (idx >= 10 || isAdm);
  const vars = { '--d': `${delay}s` } as CSSProperties;
  return (
    <span className={sweep ? 'tier-shine' : undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px 3px 6px', borderRadius: 99, background: tier.pill, border: tier.border, color: tier.text, fontSize, fontWeight: 800, whiteSpace: 'nowrap', lineHeight: 1.25, fontFamily: ''Montserrat', var(--font-jakarta), sans-serif', ...vars, ...style }}>
      <TierIcon k={tier.key} size={iconSize} />{text}
      {twinkle && (<>
        <i className="tier-spark" style={{ left: '14%', top: '8%', ...({ '--d': `${delay}s` } as CSSProperties) }} />
        <i className="tier-spark" style={{ left: '80%', top: '55%', width: 6, height: 6, ...({ '--d': `${delay + 0.9}s` } as CSSProperties) }} />
      </>)}
    </span>
  );
}

// Pil level yang bisa dipencet → membuka lembar tier
export function LevelPill({ level, label = 'Lv.', fontSize, iconSize, style }: { level: number; label?: string; fontSize?: string; iconSize?: number; style?: CSSProperties }) {
  const t = tierFor(level);
  const open = (e: { preventDefault: () => void; stopPropagation: () => void }) => { e.preventDefault(); e.stopPropagation(); openLevelSheet(level); };
  return (
    <span role="button" tabIndex={0} aria-label={`Level ${nf(level)}, tier ${t.name}. Lihat semua tier`} onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open(e); }}
      style={{ display: 'inline-flex', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
      <TierPill tier={t} text={`${label} ${nf(level)}`} fontSize={fontSize} iconSize={iconSize} style={style} shine delay={(Math.floor(Number(level) || 0) % 5) * 0.4} />
    </span>
  );
}

function Sheet({ level, onClose }: { level: number; onClose: () => void }) {
  const t = tierFor(level);
  const nx = nextTier(level);
  const idx = TIERS.indexOf(t);
  const pct = nx ? Math.min(100, Math.max(0, ((level - t.min) / (nx.min - t.min)) * 100)) : 100;
  const rows: LevelTier[] = [...TIERS, ADMIN_TIER];
  const [go, setGo] = useState(false); // isi bar naik dari 0 saat lembar terbuka
  useEffect(() => { const r = requestAnimationFrame(() => setGo(true)); return () => cancelAnimationFrame(r); }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <style>{`@keyframes lvUp{from{transform:translate3d(0,100%,0)}to{transform:none}}@keyframes lvFade{from{opacity:0}to{opacity:1}}`}</style>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', animation: 'lvFade .2s ease both' }} />
      <div role="dialog" aria-label="Semua tier level" style={{ position: 'relative', width: 'min(100%, 448px)', margin: '0 auto', height: '92vh', background: '#17181B', borderRadius: '26px 26px 0 0', overflowY: 'auto', overscrollBehavior: 'contain', padding: '0 18px calc(24px + env(safe-area-inset-bottom, 0px))', animation: 'lvUp .32s cubic-bezier(.2,.9,.25,1) both', color: '#fff', fontFamily: ''Montserrat', var(--font-jakarta), sans-serif' }}>
        <div onClick={onClose} style={{ position: 'sticky', top: 0, height: 22, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#17181B', zIndex: 2, cursor: 'pointer' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.28)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
          <span className="lv-pop" style={{ width: 56, height: 56, borderRadius: '50%', background: `radial-gradient(circle at 50% 35%, ${t.ring}66, ${t.circle} 70%)`, border: `1.5px solid ${t.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 56px' }}>
            <TierIcon k={t.key} size={34} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.1 }}>Level {nf(level)}</div>
            <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: 0.8, color: t.nameColor, marginTop: 4 }}>{t.name.toUpperCase()}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 18 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#9A9AA5' }}>{t.name}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', textAlign: 'right' }}>{nx ? `${nf(nx.min - level)} level lagi ke ${nx.name}` : 'Tier tertinggi'}</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: '#2A2B30', marginTop: 8, overflow: 'hidden' }}>
          <div className="lv-bar-fill" style={{ width: `${go ? pct : 0}%`, minWidth: go ? 6 : 0, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#7be08a,#f1e07a)', transition: 'width 1s cubic-bezier(.2,.9,.25,1) .35s' }} />
        </div>

        <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5, marginTop: 26 }}>Semua Tier Level</div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: '#9A9AA5', marginTop: 3 }}>Naik level dengan menonton anime</div>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rows.map((r) => {
            const i = TIERS.indexOf(r);
            const isAdmin = r.key === 'admin';
            const cur = !isAdmin && i === idx;
            const done = !isAdmin && i < idx;
            return (
              <div key={r.key} className={cur ? 'lv-row lv-cur' : 'lv-row'} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px', borderRadius: 14, background: cur ? 'rgba(246,216,105,.14)' : 'transparent', animationDelay: `${140 + (isAdmin ? TIERS.length : i) * 40}ms` }}>
                <span style={{ width: 42, height: 42, borderRadius: '50%', background: r.circle, border: `1.5px solid ${r.ring}99`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 42px' }}>
                  <TierIcon k={r.key} size={24} />
                </span>
                <div style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 15.5, fontWeight: 700, color: r.nameColor, letterSpacing: -0.1 }}>{r.name}</span>
                  <TierPill tier={r} text={rangeText(r)} fontSize="12px" iconSize={13} shine delay={((isAdmin ? TIERS.length : i) % 6) * 0.45} />
                </div>
                <span style={{ flex: '0 1 auto', minWidth: 0, textAlign: 'right', fontSize: 12.5, lineHeight: 1.25, fontWeight: 700, color: cur ? '#F6D869' : '#8E8E99', fontFamily: 'inherit' }}>
                  {isAdmin ? 'Khusus Admin' : cur ? 'Sekarang' : done ? '✓ Tercapai' : (<><span style={{ whiteSpace: 'nowrap' }}>{nf(r.min - level)}</span>{' '}<span style={{ whiteSpace: 'nowrap' }}>level lagi</span></>)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Pasang sekali di layout: mendengarkan openLevelSheet() dan menampilkan lembarnya. */
export function LevelSheetHost() {
  const [lv, setLv] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const f = (e: Event) => setLv(Math.max(0, Math.floor(Number((e as CustomEvent).detail?.level) || 0)));
    window.addEventListener(EVT, f);
    return () => window.removeEventListener(EVT, f);
  }, []);
  useEffect(() => {
    if (lv === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [lv]);
  if (!mounted || lv === null) return null;
  return createPortal(<Sheet level={lv} onClose={() => setLv(null)} />, document.body);
}

export default LevelPill;
