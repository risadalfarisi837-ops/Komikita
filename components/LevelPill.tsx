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

// Pil berwarna sesuai tier (ikon + teks)
export function TierPill({ tier, text, fontSize = '12px', iconSize = 13, style }: { tier: LevelTier; text: string; fontSize?: string; iconSize?: number; style?: CSSProperties }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px 2px 6px', borderRadius: 99, background: tier.pill, border: tier.border, color: tier.text, fontSize, fontWeight: 700, whiteSpace: 'nowrap', lineHeight: 1.25, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.16)', ...style }}>
      <TierIcon k={tier.key} size={iconSize} />{text}
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
      <TierPill tier={t} text={`${label} ${nf(level)}`} fontSize={fontSize} iconSize={iconSize} style={style} />
    </span>
  );
}

function Sheet({ level, onClose }: { level: number; onClose: () => void }) {
  const t = tierFor(level);
  const nx = nextTier(level);
  const idx = TIERS.indexOf(t);
  const pct = nx ? Math.min(100, Math.max(0, ((level - t.min) / (nx.min - t.min)) * 100)) : 100;
  const rows: LevelTier[] = [...TIERS, ADMIN_TIER];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <style>{`@keyframes lvUp{from{transform:translate3d(0,100%,0)}to{transform:none}}@keyframes lvFade{from{opacity:0}to{opacity:1}}`}</style>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', animation: 'lvFade .2s ease both' }} />
      <div role="dialog" aria-label="Semua tier level" style={{ position: 'relative', width: 'min(100%, 448px)', margin: '0 auto', height: '92vh', background: '#17181B', borderRadius: '26px 26px 0 0', overflowY: 'auto', overscrollBehavior: 'contain', padding: '0 18px calc(24px + env(safe-area-inset-bottom, 0px))', animation: 'lvUp .32s cubic-bezier(.2,.9,.25,1) both', color: '#fff' }}>
        <div onClick={onClose} style={{ position: 'sticky', top: 0, height: 22, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#17181B', zIndex: 2, cursor: 'pointer' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.28)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
          <span style={{ width: 66, height: 66, borderRadius: '50%', background: t.circle, border: `2px solid ${t.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 66px' }}>
            <TierIcon k={t.key} size={38} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.1 }}>Level {nf(level)}</div>
            <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: 0.8, color: t.nameColor, marginTop: 4 }}>{t.name.toUpperCase()}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 18 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#9A9AA5' }}>{t.name}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', textAlign: 'right' }}>{nx ? `${nf(nx.min - level)} level lagi ke ${nx.name}` : 'Tier tertinggi'}</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: '#2A2B30', marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, minWidth: 6, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#7be08a,#f1e07a)', transition: 'width .6s' }} />
        </div>

        <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5, marginTop: 26 }}>Semua Tier Level</div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: '#9A9AA5', marginTop: 3 }}>Naik level dengan menonton anime</div>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((r) => {
            const i = TIERS.indexOf(r);
            const isAdmin = r.key === 'admin';
            const cur = !isAdmin && i === idx;
            const done = !isAdmin && i < idx;
            return (
              <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', borderRadius: 16, background: cur ? 'rgba(246,216,105,.14)' : 'transparent' }}>
                <span style={{ width: 48, height: 48, borderRadius: '50%', background: r.circle, border: `1.5px solid ${r.ring}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 48px' }}>
                  <TierIcon k={r.key} size={26} />
                </span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: r.nameColor, letterSpacing: -0.2 }}>{r.name}</span>
                  <TierPill tier={r} text={rangeText(r)} fontSize="12px" iconSize={13} />
                </div>
                <span style={{ flex: '0 0 auto', textAlign: 'right', fontSize: 13, fontWeight: 700, color: cur ? '#F6D869' : '#8E8E99' }}>
                  {isAdmin ? 'Khusus Admin' : cur ? 'Sekarang' : done ? '✓ Tercapai' : `${nf(r.min - level)} level lagi`}
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
