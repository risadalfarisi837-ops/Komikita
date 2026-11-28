'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { getFirebase } from '@/lib/firebase-client';
import { PROMO_PACKS, PROMO_QRIS_NAME, PROMO_TTL, PROMO_WA, rewardText, uniqueAmount } from '@/lib/promoPacks';
import type { PromoPackId } from '@/lib/promoPacks';

const BROWN = '#5a3b1e';
const WA_READY = /^\d{9,15}$/.test(PROMO_WA);
const idn = (n: number) => Math.round(n).toLocaleString('id-ID');

interface Props {
  px: (n: number) => number;
  font: string;
  packId: PromoPackId;
  onClose: () => void;
  /** Dipanggil saat admin sudah menyetujui dan hadiah masuk. */
  onPaid?: () => void;
}

type Order = { id: string; amount: number; createdAt: number; claimed: boolean };
type St = 'load' | 'wait' | 'ok' | 'rejected' | 'expired' | 'err';

export default function ShopPay({ px, font, packId, onClose, onPaid }: Props) {
  const pack = PROMO_PACKS[packId];
  const LS = 'komikita-promo-order-' + packId;
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<St>('load');
  const [err, setErr] = useState('');
  const [qrMissing, setQrMissing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState('');

  // buat pesanan baru, atau lanjutkan yang masih menunggu
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const f: any = await getFirebase();
        const u = f.auth.currentUser;
        if (!u) { if (alive) { setErr('Masuk dulu lewat halaman Profil.'); setState('err'); } return; }
        const nm = u.displayName || 'User';
        if (alive) setName(nm);
        try {
          const oid = localStorage.getItem(LS);
          if (oid) {
            const o = (await f.db.ref('promoOrders/' + oid).get()).val();
            if (o && o.uid === u.uid && o.pack === packId && o.status === 'pending' && Date.now() - o.createdAt < PROMO_TTL) {
              if (alive) { setOrder({ id: oid, amount: o.amount, createdAt: o.createdAt, claimed: !!o.claimed }); setState('wait'); }
              return;
            }
            localStorage.removeItem(LS);
          }
        } catch { /* lanjut buat pesanan baru */ }
        const amount = uniqueAmount(pack.rupiah);
        const ref = f.db.ref('promoOrders').push();
        const createdAt = Date.now();
        await ref.set({ uid: u.uid, name: nm, pack: packId, amount, base: pack.rupiah, status: 'pending', createdAt });
        try { localStorage.setItem(LS, String(ref.key)); } catch { /* abaikan */ }
        if (alive) { setOrder({ id: String(ref.key), amount, createdAt, claimed: false }); setState('wait'); }
      } catch (e: any) {
        if (alive) { setErr('Gagal membuat pesanan: ' + (e?.message || 'coba lagi')); setState('err'); }
      }
    })();
    return () => { alive = false; };
  }, [packId]); // eslint-disable-line react-hooks/exhaustive-deps

  // pantau pesanan: saat admin menyetujui, layar ini berubah sendiri
  useEffect(() => {
    if (!order || state !== 'wait') return;
    let alive = true;
    const poll = setInterval(async () => {
      try {
        if (Date.now() - order.createdAt > PROMO_TTL) { setState('expired'); try { localStorage.removeItem(LS); } catch { /* abaikan */ } return; }
        const f: any = await getFirebase();
        const o = (await f.db.ref('promoOrders/' + order.id).get()).val();
        if (!alive || !o) return;
        if (o.status === 'approved') {
          setState('ok');
          try { localStorage.removeItem(LS); } catch { /* abaikan */ }
          onPaid?.();
        } else if (o.status === 'rejected') {
          setState('rejected');
          try { localStorage.removeItem(LS); } catch { /* abaikan */ }
        }
      } catch { /* coba lagi di putaran berikutnya */ }
    }, 4000);
    return () => { alive = false; clearInterval(poll); };
  }, [order, state]); // eslint-disable-line react-hooks/exhaustive-deps

  const waUrl = () => {
    if (!order || !WA_READY) return '';
    const teks = `Halo, saya sudah bayar paket "${pack.nama}" di Toko Promo Komikita.\n\nHadiah: ${rewardText(pack)}\nNominal: Rp ${idn(order.amount)}\nNama: ${name || 'User'}\nID pesanan: ${order.id}\n\nBukti pembayaran saya kirim di chat ini.`;
    return `https://wa.me/${PROMO_WA}?text=${encodeURIComponent(teks)}`;
  };
  const bukaWa = () => { const url = waUrl(); if (url) window.open(url, '_blank'); };

  const sudahBayar = async () => {
    if (!order) return;
    bukaWa(); // dibuka sebelum proses async supaya tidak diblokir browser
    try {
      const f: any = await getFirebase();
      await f.db.ref(`promoOrders/${order.id}/claimed`).set(true);
      setOrder({ ...order, claimed: true });
    } catch { setErr('Gagal mengirim konfirmasi. Coba lagi.'); }
  };

  const salin = () => {
    if (!order) return;
    try { navigator.clipboard.writeText(String(order.amount)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* abaikan */ }
  };

  const bigBtn = (bg: string, edge: string, color: string): CSSProperties => ({
    width: '100%', border: 0, cursor: 'pointer', fontFamily: font, fontWeight: 800, fontSize: px(20), color, padding: `${px(9)}px 0`,
    borderRadius: px(12), background: bg, boxShadow: `0 ${px(3)}px 0 ${edge}`,
  });
  const GOLD = bigBtn('linear-gradient(180deg,#ffd45a,#f5a623)', '#b97a12', '#4a2f00');
  const GREEN = bigBtn('linear-gradient(180deg,#58e89a,#1fa85a)', '#167a40', '#fff');
  const SAND: CSSProperties = { ...bigBtn('#f5e6c8', '#e6d4b0', BROWN), fontSize: px(16), padding: `${px(7)}px 0`, boxShadow: 'inset 0 0 0 2px #e6d4b0' };

  const msgBox = (title: string, desc: string, emoji: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(8), textAlign: 'center', padding: `${px(14)}px ${px(10)}px` }}>
      <div style={{ fontSize: px(46) }}>{emoji}</div>
      <div style={{ fontWeight: 800, fontSize: px(24) }}>{title}</div>
      <div style={{ fontWeight: 700, fontSize: px(15), color: '#8a7a68', maxWidth: px(560), lineHeight: 1.4 }}>{desc}</div>
      <div style={{ width: px(260), marginTop: px(8) }}><button onClick={onClose} style={state === 'ok' ? GREEN : SAND}>{state === 'ok' ? 'Selesai' : 'Tutup'}</button></div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(0,12,40,.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(10), fontFamily: font, color: BROWN }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: px(980), maxHeight: '100%', display: 'flex', flexDirection: 'column', background: '#fdf6e6', borderRadius: px(24), border: `${px(4)}px solid #1362cf`, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(12), background: 'linear-gradient(180deg,#1d7bea,#1362cf)', padding: `${px(8)}px ${px(14)}px`, boxShadow: '0 3px 0 #0d4aa0', flex: 'none' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: px(26) }}>Bayar · {pack.nama}</span>
          <button onClick={onClose} aria-label="Tutup" style={{ marginLeft: 'auto', width: px(52), height: px(46), borderRadius: px(12), border: 0, background: 'linear-gradient(180deg,#ee5a4a,#d0392b)', boxShadow: `0 ${px(3)}px 0 #a02a20`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            <svg width={px(26)} height={px(26)} viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="kk-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: px(14) }}>
          {state === 'load' && <div style={{ textAlign: 'center', fontWeight: 800, fontSize: px(18), padding: px(40), color: '#8a6d4a' }}>Membuat pesanan…</div>}
          {state === 'err' && msgBox('Gagal', err || 'Coba lagi nanti.', '⚠️')}
          {state === 'ok' && msgBox('Pembayaran diterima!', `Hadiah ${rewardText(pack)} sudah masuk ke akunmu. Terima kasih sudah mendukung Komikita!`, '✅')}
          {state === 'rejected' && msgBox('Pembayaran ditolak', 'Admin belum menemukan pembayaran dengan nominal itu. Kalau kamu sudah bayar, hubungi admin lewat WhatsApp.', '❌')}
          {state === 'expired' && msgBox('Pesanan kedaluwarsa', 'Pesanan berlaku 24 jam. Buat pesanan baru kalau belum bayar.', '⌛')}

          {state === 'wait' && order && (
            <div style={{ display: 'flex', gap: px(18), alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ flex: 'none', textAlign: 'center' }}>
                <div style={{ background: '#fff', borderRadius: px(14), padding: px(8), border: '3px solid #eadfc7', width: px(250), height: px(250), display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'content-box' }}>
                  {qrMissing
                    ? <span style={{ color: '#333', fontWeight: 700, fontSize: px(13) }}>Gambar QRIS belum dipasang (public/qris.png)</span>
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src="/qris.png" alt="QRIS" onError={() => setQrMissing(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />}
                </div>
                <div style={{ fontWeight: 800, fontSize: px(14), color: '#8a6d4a', marginTop: px(6) }}>QRIS · {PROMO_QRIS_NAME}</div>
              </div>

              <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: px(6) }}>
                <div style={{ fontWeight: 800, fontSize: px(14), color: '#8a6d4a' }}>Bayar TEPAT sebesar</div>
                <button onClick={salin} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: font, color: '#c47f10', fontWeight: 800, fontSize: px(40), lineHeight: 1.05 }}>Rp {idn(order.amount)}</button>
                <div style={{ fontWeight: 700, fontSize: px(13), color: '#8a7a68', lineHeight: 1.35 }}>{copied ? 'Nominal disalin ✓' : 'Tap nominal untuk menyalin. 3 digit terakhir dipakai admin untuk mencocokkan pembayaranmu.'}</div>
                <div style={{ fontWeight: 800, fontSize: px(15), marginTop: px(2) }}>Hadiah: <span style={{ color: '#1f7a30' }}>{rewardText(pack)}</span></div>
                <div style={{ fontWeight: 700, fontSize: px(14), lineHeight: 1.5, color: '#6a5a48', marginTop: px(2) }}>
                  1. Scan QRIS dengan DANA atau e-wallet apa saja<br />
                  2. Isi nominal persis seperti di atas<br />
                  {WA_READY ? <>3. Tap “Saya sudah bayar”, WhatsApp admin terbuka, kirim screenshot bukti bayarnya<br /></> : <>3. Tap “Saya sudah bayar”<br /></>}
                  Admin mengecek lalu mengirim hadiah. Layar ini berubah sendiri.
                </div>
                {err && <div style={{ fontWeight: 800, fontSize: px(13), color: '#9c2a18' }}>{err}</div>}
                {order.claimed ? (
                  <>
                    <div style={{ fontWeight: 800, fontSize: px(16), color: '#1f7a30', marginTop: px(4) }}>✓ Menunggu persetujuan admin</div>
                    {WA_READY && <button onClick={bukaWa} style={bigBtn('linear-gradient(180deg,#3ee07a,#1fa85a)', '#167a40', '#06301a')}>Kirim bukti ke WhatsApp</button>}
                  </>
                ) : (
                  <button onClick={sudahBayar} style={{ ...GOLD, marginTop: px(4) }}>Saya sudah bayar</button>
                )}
                <button onClick={onClose} style={SAND}>Tutup (pesanan tetap tersimpan)</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
