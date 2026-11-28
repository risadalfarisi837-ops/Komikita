'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { RARITY, SPECIES_BY_ID, fishPrice, formatNum, formatWeight, isShowoff } from '@/lib/fishing';
import type { BagItem } from '@/lib/fishing';
import { CrystalIcon } from './Shop';

type Tab = 'semua' | 'biasa' | 'berharga';
type Rar = keyof typeof RARITY;

interface Props {
  px: (n: number) => number;
  font: string;
  bag: BagItem[];
  /** bonus uang dari joran yang dipakai (rod.money) */
  money: number;
  crystal: number;
  /** jual ikan berdasarkan id, mengembalikan Crystal yang didapat (<0 = belum login) */
  onSell: (ids: string[]) => Promise<number | void>;
  onClose: () => void;
  /** buka Toko Mancing (umpan, joran, gacha) */
  onOpenShop: () => void;
  /** gambar ikan piksel (dari FishingGame) */
  renderFish: (id: string, scale: number) => ReactNode;
}

const RAR_BORDER: Record<Rar, string> = { common: '#9aa3ad', uncommon: '#4fc261', rare: '#4aa3ff', epic: '#b48cff', legendary: '#f5c451', mythic: '#ff5d7a', divine: '#7df9ff', secret: '#e879f9' };
const RAR_NAME: Record<Rar, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic', divine: 'Divine', secret: 'Secret' };

export default function SellFish({ px, font, bag, money, crystal, onSell, onClose, onOpenShop, renderFish }: Props) {
  const [tab, setTab] = useState<Tab>('semua');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<BagItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    return bag
      .map((b) => {
        const sp = SPECIES_BY_ID[b.s];
        if (!sp) return null;
        return { b, sp, price: fishPrice(sp, b.w, money), valuable: isShowoff(sp, b.w) };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, c) => c.price - a.price);
  }, [bag, money]);

  const nBiasa = rows.filter((r) => !r.valuable).length;
  const nBerharga = rows.length - nBiasa;
  const shown = rows.filter((r) => tab === 'semua' || (tab === 'biasa' ? !r.valuable : r.valuable));
  const shownIds = shown.map((r) => r.b.id);
  // yang dibuang dari pilihan kalau ikannya sudah terjual / hilang dari tas
  const alive = new Set(rows.map((r) => r.b.id));
  const sel = new Set([...picked].filter((id) => alive.has(id)));
  const allPicked = shown.length > 0 && shownIds.every((id) => sel.has(id));

  const targets = sel.size ? rows.filter((r) => sel.has(r.b.id)) : shown;
  const targetTotal = targets.reduce((s, r) => s + r.price, 0);

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglePage = () => setPicked((p) => {
    const n = new Set(p);
    if (allPicked) shownIds.forEach((id) => n.delete(id)); else shownIds.forEach((id) => n.add(id));
    return n;
  });

  const doSell = async (items: { b: BagItem }[]) => {
    if (!items.length || busy) return;
    setBusy(true);
    try { await onSell(items.map((x) => x.b.id)); } finally { setBusy(false); }
    setPicked(new Set());
    setConfirm(null);
  };
  const askSell = () => {
    if (!targets.length) return;
    if (targets.some((r) => r.valuable)) setConfirm(targets.map((r) => r.b)); else void doSell(targets);
  };

  const ink = '#5a3b1e';
  const pill = (bg: string, color = '#fff'): CSSProperties => ({ display: 'inline-block', background: bg, color, fontWeight: 700, fontSize: px(10), borderRadius: 99, padding: `${px(1)}px ${px(9)}px`, lineHeight: 1.35 });
  const cream: CSSProperties = { border: `${px(2)}px solid #e6d0a0`, borderRadius: px(13), background: 'linear-gradient(180deg,#fffdf4,#fbf0d6)', color: ink, fontFamily: font, fontWeight: 700, cursor: 'pointer' };

  const cStats = confirm ? confirm.map((b) => ({ b, sp: SPECIES_BY_ID[b.s], price: fishPrice(SPECIES_BY_ID[b.s], b.w, money) })) : [];
  const cValuable = cStats.filter((x) => isShowoff(x.sp, x.b.w));
  const cKeepTotal = cStats.filter((x) => !isShowoff(x.sp, x.b.w)).reduce((s, x) => s + x.price, 0);
  const cAllTotal = cStats.reduce((s, x) => s + x.price, 0);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(8,14,28,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: `min(96%, ${px(760)}px)`, maxHeight: '94%', display: 'flex', flexDirection: 'column', background: '#fdf5e4', borderRadius: px(20), border: `${px(3)}px solid #173d86`, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: px(9), background: 'linear-gradient(180deg,#1580ee,#0c66d0)', padding: `${px(7)}px ${px(12)}px`, borderBottom: `${px(3)}px solid #0b4fa8`, flex: '0 0 auto' }}>
          <span style={{ width: px(32), height: px(32), borderRadius: '50%', background: '#fff2d2', border: `${px(2.5)}px solid #e6d0a0`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: px(16) }}>🐟</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: px(16), textShadow: '0 1px 0 rgba(0,0,0,0.25)' }}>Jual Ikan</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: px(6), background: 'rgba(8,30,74,0.55)', color: '#fff', fontWeight: 700, fontSize: px(14), borderRadius: 99, padding: `${px(3)}px ${px(12)}px` }}>
            <CrystalIcon size={px(16)} />{formatNum(crystal)}
          </span>
          <button onClick={onOpenShop} style={{ ...cream, height: px(34), padding: `0 ${px(14)}px`, fontSize: px(13) }}>Toko</button>
          <button onClick={onClose} aria-label="Tutup" style={{ width: px(40), height: px(36), borderRadius: px(11), border: 0, background: 'linear-gradient(180deg,#e5533f,#cc3d2c)', boxShadow: '0 3px 0 #a62a1f', color: '#fff', fontSize: px(18), fontWeight: 700, cursor: 'pointer' }}>✕</button>
        </div>

        {/* tab + pilih semua */}
        <div style={{ display: 'flex', alignItems: 'center', gap: px(8), padding: `${px(10)}px ${px(12)}px ${px(4)}px`, flex: '0 0 auto' }}>
          <div style={{ flex: 1, display: 'flex', background: '#efe3c6', borderRadius: px(13), padding: px(3), gap: px(3) }}>
            {([['semua', 'Semua', rows.length], ['biasa', 'Biasa', nBiasa], ['berharga', 'Berharga', nBerharga]] as [Tab, string, number][]).map(([k, label, n]) => (
              <button key={k} onClick={() => setTab(k)} style={{ flex: 1, border: 0, borderRadius: px(10), padding: `${px(7)}px 0`, background: tab === k ? '#fff' : 'transparent', color: tab === k ? '#0f4aa8' : '#8a7a64', fontFamily: font, fontWeight: 700, fontSize: px(14), cursor: 'pointer' }}>
                {label} <span style={{ fontSize: px(11), opacity: 0.8 }}>{n}</span>
              </button>
            ))}
          </div>
          <button onClick={togglePage} disabled={!shown.length} style={{ ...cream, height: px(38), padding: `0 ${px(14)}px`, fontSize: px(13), opacity: shown.length ? 1 : 0.5 }}>{allPicked ? 'Batal pilih' : 'Pilih semua'}</button>
        </div>

        {/* grid ikan */}
        <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: `${px(8)}px ${px(12)}px ${px(70)}px` }}>
          {shown.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8a7a64', fontWeight: 600, fontSize: px(14), padding: `${px(36)}px 0` }}>{rows.length === 0 ? 'Tasmu kosong. Pergi mancing dulu, yuk!' : 'Tidak ada ikan di tab ini.'}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(' + px(96) + 'px, 1fr))', gap: px(8) }}>
              {shown.map(({ b, sp, price, valuable }) => {
                const on = sel.has(b.id);
                const col = RAR_BORDER[sp.rarity as Rar] || RAR_BORDER.common;
                return (
                  <button key={b.id} onClick={() => toggle(b.id)} style={{ position: 'relative', textAlign: 'center', padding: `${px(8)}px ${px(4)}px ${px(6)}px`, borderRadius: px(14), background: on ? '#fff7d6' : '#e9dfc5', border: `${px(3)}px solid ${col}`, boxShadow: on ? '0 0 0 2px #f5c451' : 'none', cursor: 'pointer', fontFamily: font, color: ink, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(3) }}>
                    <span style={{ position: 'absolute', top: px(5), right: px(5), width: px(16), height: px(16), borderRadius: '50%', border: `${px(2)}px solid #b9ab8d`, background: on ? '#1fa85a' : '#fff', boxSizing: 'border-box', color: '#fff', fontSize: px(10), lineHeight: `${px(12)}px` }}>{on ? '✓' : ''}</span>
                    <span style={{ display: 'flex', justifyContent: 'center', minHeight: px(34), alignItems: 'center' }}>{renderFish(sp.id, 1)}</span>
                    <span style={pill(col)}>{RAR_NAME[sp.rarity as Rar] || ''}</span>
                    <span style={{ fontWeight: 700, fontSize: px(12), lineHeight: 1.1 }}>{sp.name}</span>
                    <span style={{ fontSize: px(10.5), color: '#7a6a52', fontWeight: 600 }}>{formatWeight(b.w)}{valuable ? ' ★' : ''}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(3), fontWeight: 700, fontSize: px(12) }}><CrystalIcon size={px(13)} />{formatNum(price)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* tombol jual */}
        <div style={{ position: 'absolute', right: px(14), bottom: px(12) }}>
          <button onClick={askSell} disabled={!targets.length || busy} style={{ border: `${px(3)}px solid #a8741a`, borderRadius: px(14), background: 'linear-gradient(180deg,#ffd75a,#f2a81c)', boxShadow: '0 3px 0 #a8741a', color: '#5a3600', fontFamily: font, fontWeight: 700, fontSize: px(15), padding: `${px(8)}px ${px(18)}px`, cursor: 'pointer', opacity: !targets.length || busy ? 0.55 : 1, display: 'inline-flex', alignItems: 'center', gap: px(6) }}>
            {sel.size ? `Jual terpilih (${sel.size})` : 'Jual semua'} · <CrystalIcon size={px(16)} />{formatNum(targetTotal)}
          </button>
        </div>

        {/* konfirmasi ikan berharga */}
        {confirm && (
          <div onClick={() => setConfirm(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(8,14,28,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: `min(88%, ${px(380)}px)`, background: '#fdf5e4', borderRadius: px(18), border: `${px(3)}px solid #173d86`, padding: px(16), textAlign: 'center', display: 'flex', flexDirection: 'column', gap: px(8) }}>
              <div style={{ fontWeight: 700, fontSize: px(17), color: ink }}>Jual ikan berharga juga?</div>
              <div style={{ fontWeight: 600, fontSize: px(12.5), color: '#7a6a52' }}>Ada {cValuable.length} ikan Epik ke atas atau berukuran XL di pilihanmu.</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: px(4), flexWrap: 'wrap' }}>{cValuable.slice(0, 5).map((x) => <span key={x.b.id}>{renderFish(x.sp.id, 0.8)}</span>)}</div>
              <button disabled={busy} onClick={() => void doSell(cStats)} style={{ border: `${px(3)}px solid #a8741a`, borderRadius: px(13), background: 'linear-gradient(180deg,#ffd75a,#f2a81c)', color: '#5a3600', fontFamily: font, fontWeight: 700, fontSize: px(14), padding: `${px(9)}px 0`, cursor: 'pointer' }}>Jual semua · <CrystalIcon size={px(15)} /> {formatNum(cAllTotal)}</button>
              <button disabled={busy || cKeepTotal <= 0} onClick={() => void doSell(cStats.filter((x) => !isShowoff(x.sp, x.b.w)))} style={{ border: `${px(3)}px solid #0b4fa8`, borderRadius: px(13), background: 'linear-gradient(180deg,#2c93f5,#1272dc)', color: '#fff', fontFamily: font, fontWeight: 700, fontSize: px(14), padding: `${px(9)}px 0`, cursor: 'pointer', opacity: cKeepTotal > 0 ? 1 : 0.5 }}>Simpan yang berharga · <CrystalIcon size={px(15)} /> {formatNum(cKeepTotal)}</button>
              <button onClick={() => setConfirm(null)} style={{ ...cream, padding: `${px(8)}px 0`, fontSize: px(14) }}>Batal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
