'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { getFirebase } from '@/lib/firebase-client';
import { TOPUP_PACKS as PACKS } from '@/lib/topupPacks';
import type { QrOrder, TopUpCurrency, TopUpPoll } from '@/lib/topupPacks';
import { PROMO_QRIS_NAME, PROMO_TTL, PROMO_WA, uniqueAmount } from '@/lib/promoPacks';
export type { TopUpCurrency };

type BuyResult = string | QrOrder | void | Promise<string | QrOrder | void>;

const WA_READY = /^\d{9,15}$/.test(PROMO_WA);

// Pesanan top up manual (sama seperti Premium): QRIS statis /qris.png + nominal unik, admin menyetujui di Panel Developer.
type ManualOrder = { id: string; amount: number; createdAt: number; claimed: boolean; cur: TopUpCurrency; total: number; ls: string };

interface Props {
  px: (n: number) => number;
  font: string;
  initial?: TopUpCurrency;
  gems: number;
  crystal: number;
  gemIcon: (size: number) => ReactNode;
  crystalIcon: (size: number) => ReactNode;
  onClose: () => void;
  /** Tidak dipakai lagi (top up sekarang manual via QRIS + persetujuan admin). Dibiarkan supaya pemanggil lama tetap valid. */
  onBuy?: (currency: TopUpCurrency, packId: string, amount: number, bonus: number, rupiah: number) => BuyResult;
  /** Tidak dipakai lagi. */
  onPoll?: (orderId: string) => Promise<TopUpPoll>;
  /** Dipanggil saat admin menyetujui pembayaran (muat ulang saldo). */
  onPaid?: () => void;
}

// Gems = ungu, Crystal = biru. Seluruh jendela (bingkai, header, kartu, tombol tab) ikut berganti warna.
const THEME = {
  gems: {
    name: 'Gems', sub: 'Mata uang premium',
    main: '#b02ad0', grad: 'linear-gradient(180deg,#e060f5,#b02ad0)', edge: '#7a1a96',
    head: 'linear-gradient(180deg,#c957e8,#9a1fbb)', headEdge: '#6e1088', frame: '#b02ad0', frameEdge: '#5e0d78',
    card: '#e9b6f2', bg: 'linear-gradient(180deg,#ffffff,#fbeefd)', page: '#fbf0fd', chip: '#f6dbfb',
    use: ['Baju Limited', 'Gacha Rumah', 'Pet', 'Etalase'],
  },
  crystal: {
    name: 'Crystal', sub: 'Mata uang utama',
    main: '#1f7fe0', grad: 'linear-gradient(180deg,#5cc6ff,#1f86e8)', edge: '#15609f',
    head: 'linear-gradient(180deg,#1479ec,#0b62cc)', headEdge: '#0a4fa8', frame: '#1a74e4', frameEdge: '#0b3f8f',
    card: '#a9d8f5', bg: 'linear-gradient(180deg,#ffffff,#eef8ff)', page: '#eef8ff', chip: '#d3ebfb',
    use: ['Gacha Rod', 'Gacha Gaya', 'Etalase'],
  },
} as const;

const idn = (n: number) => n.toLocaleString('id-ID');
const rupiah = (n: number) => 'Rp' + idn(n);
const BROWN = '#5a3b1e';

export default function ShopTopUp({ px, font, initial = 'gems', gems, crystal, gemIcon, crystalIcon, onClose, onPaid }: Props) {
  const [cur, setCur] = useState<TopUpCurrency>(initial);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [qr, setQr] = useState<ManualOrder | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrMissing, setQrMissing] = useState(false);
  const [name, setName] = useState('');
  const paidRef = useRef(false);
  const t = THEME[cur];

  // pantau pesanan tiap 4 detik: saat admin menyetujui, layar berubah sendiri dan saldo dimuat ulang
  useEffect(() => {
    if (!qr || paid) return;
    let alive = true;
    const tick = async () => {
      try {
        if (Date.now() - qr.createdAt > PROMO_TTL) {
          try { localStorage.removeItem(qr.ls); } catch { /* abaikan */ }
          if (alive) { setQr(null); setMsg('Pesanan kedaluwarsa. Pilih paket lagi untuk membuat pesanan baru.'); }
          return;
        }
        const f: any = await getFirebase();
        const o = (await f.db.ref('topupOrders/' + qr.id).get()).val();
        if (!alive || !o) return;
        if (o.status === 'approved') {
          try { localStorage.removeItem(qr.ls); } catch { /* abaikan */ }
          if (!paidRef.current) { paidRef.current = true; setPaid(true); onPaid?.(); }
        } else if (o.status === 'rejected') {
          try { localStorage.removeItem(qr.ls); } catch { /* abaikan */ }
          setQr(null);
          setMsg('Pembayaran belum ditemukan oleh admin. Kalau kamu sudah bayar, hubungi admin lewat WhatsApp.');
        }
      } catch { /* coba lagi di putaran berikutnya */ }
    };
    const id = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(id); };
  }, [qr, paid, onPaid]);
  const icon = (c: TopUpCurrency, s: number) => (c === 'gems' ? gemIcon(s) : crystalIcon(s));

  // buat pesanan baru (atau lanjutkan yang masih menunggu), lalu tampilkan QRIS
  const buy = async (pk: (typeof PACKS)[TopUpCurrency][number]) => {
    if (busy) return;
    setMsg('');
    setBusy(pk.id);
    try {
      const f: any = await getFirebase();
      const u = f.auth.currentUser;
      if (!u) { setMsg('Masuk dulu lewat halaman Profil untuk top up.'); setBusy(''); return; }
      const nm = u.displayName || 'User';
      setName(nm);
      const total = pk.amount + pk.bonus;
      const LS = `komikita-topup-order-${cur}-${pk.id}`;
      let order: { id: string; amount: number; createdAt: number; claimed: boolean } | null = null;
      try {
        const oid = localStorage.getItem(LS);
        if (oid) {
          const o = (await f.db.ref('topupOrders/' + oid).get()).val();
          if (o && o.uid === u.uid && o.currency === cur && o.packId === pk.id && o.status === 'pending' && Date.now() - o.createdAt < PROMO_TTL) {
            order = { id: oid, amount: o.amount, createdAt: o.createdAt, claimed: !!o.claimed };
          } else localStorage.removeItem(LS);
        }
      } catch { /* lanjut buat pesanan baru */ }
      if (!order) {
        const amount = uniqueAmount(pk.rupiah);
        const ref = f.db.ref('topupOrders').push();
        const createdAt = Date.now();
        await ref.set({ uid: u.uid, name: nm, currency: cur, packId: pk.id, gain: total, amount, base: pk.rupiah, status: 'pending', createdAt });
        try { localStorage.setItem(LS, String(ref.key)); } catch { /* abaikan */ }
        order = { id: String(ref.key), amount, createdAt, claimed: false };
      }
      paidRef.current = false;
      setPaid(false);
      setQrMissing(false);
      setQr({ ...order, cur, total, ls: LS });
    } catch (e: any) {
      setMsg('Gagal membuat pesanan: ' + (e?.message || 'coba lagi'));
    }
    setBusy('');
  };

  const waUrl = () => {
    if (!qr || !WA_READY) return '';
    const teks = `Halo, saya sudah bayar top up ${THEME[qr.cur].name} di Komikita.\n\nJumlah: ${idn(qr.total)} ${THEME[qr.cur].name}\nNominal: Rp ${idn(qr.amount)}\nNama: ${name || 'User'}\nID pesanan: ${qr.id}\n\nBukti pembayaran saya kirim di chat ini.`;
    return `https://wa.me/${PROMO_WA}?text=${encodeURIComponent(teks)}`;
  };
  const bukaWa = () => { const url = waUrl(); if (url) window.open(url, '_blank'); };
  const sudahBayar = async () => {
    if (!qr) return;
    bukaWa(); // dibuka sebelum proses async supaya tidak diblokir browser
    try {
      const f: any = await getFirebase();
      await f.db.ref(`topupOrders/${qr.id}/claimed`).set(true);
      setQr({ ...qr, claimed: true });
    } catch { setMsg('Gagal mengirim konfirmasi. Coba lagi.'); }
  };
  const salin = () => {
    if (!qr) return;
    try { navigator.clipboard.writeText(String(qr.amount)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* abaikan */ }
  };

  const tabBtn = (c: TopUpCurrency): CSSProperties => {
    const on = cur === c;
    const th = THEME[c];
    return {
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: px(10), border: 0, cursor: 'pointer', fontFamily: font, fontWeight: 800, fontSize: px(20),
      borderRadius: px(16), padding: `${px(10)}px ${px(14)}px`, background: on ? th.grad : '#f5e6c8', color: on ? '#fff' : BROWN,
      boxShadow: on ? `0 ${px(4)}px 0 ${th.edge}` : 'inset 0 0 0 2px #e6d4b0', textShadow: on ? '0 1.5px 0 rgba(0,0,0,.25)' : 'none',
    };
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(0,12,40,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: px(10), fontFamily: font, color: BROWN }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: px(980), maxHeight: '100%', display: 'flex', flexDirection: 'column', background: t.page, borderRadius: px(24), border: `${px(4)}px solid ${t.frame}`, boxShadow: `0 0 0 2px ${t.frameEdge}`, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(12), background: t.head, padding: `${px(8)}px ${px(14)}px`, boxShadow: `0 3px 0 ${t.headEdge}`, flex: 'none' }}>
          {icon(cur, px(34))}
          <span style={{ color: '#fff', fontWeight: 700, fontSize: px(26) }}>Top Up {t.name}</span>
          <button onClick={onClose} aria-label="Tutup" style={{ marginLeft: 'auto', width: px(52), height: px(46), borderRadius: px(12), border: 0, background: 'linear-gradient(180deg,#ee5a4a,#d0392b)', boxShadow: `0 ${px(3)}px 0 #a02a20`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            <svg width={px(26)} height={px(26)} viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>
          </button>
        </div>

        {msg && <div style={{ flex: 'none', background: '#fde4df', color: '#9c2a18', borderBottom: '2px solid #f3b4a8', textAlign: 'center', fontWeight: 800, fontSize: px(15), padding: `${px(8)}px ${px(12)}px` }}>{msg}</div>}
        <div className="kk-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: px(14) }}>
          {qr ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(8), textAlign: 'center' }}>
              {paid ? (
                <>
                  <div style={{ fontSize: px(46) }}>✅</div>
                  <div style={{ fontWeight: 800, fontSize: px(24), color: '#1f7a30' }}>Pembayaran berhasil!</div>
                  <div style={{ fontWeight: 800, fontSize: px(18), display: 'inline-flex', alignItems: 'center', gap: px(8) }}>+{idn(qr.total)} {THEME[qr.cur].name} {icon(qr.cur, px(26))}</div>
                  <button onClick={onClose} style={{ marginTop: px(8), border: 0, cursor: 'pointer', fontFamily: font, fontWeight: 800, fontSize: px(19), color: '#fff', padding: `${px(8)}px ${px(40)}px`, borderRadius: px(12), background: 'linear-gradient(180deg,#58e89a,#1fa85a)', boxShadow: `0 ${px(3)}px 0 #167a40` }}>Selesai</button>
                </>
              ) : (
                <div style={{ display: 'flex', gap: px(18), alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', textAlign: 'left', width: '100%' }}>
                  <div style={{ flex: 'none', textAlign: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: px(14), padding: px(8), border: `${px(3)}px solid ${THEME[qr.cur].card}`, width: px(250), height: px(250), display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'content-box' }}>
                      {qrMissing
                        ? <span style={{ color: '#333', fontWeight: 700, fontSize: px(13) }}>Gambar QRIS belum dipasang (public/qris.png)</span>
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src="/qris.png" alt="QRIS" onError={() => setQrMissing(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: px(14), color: '#8a6d4a', marginTop: px(6) }}>QRIS · {PROMO_QRIS_NAME}</div>
                  </div>
                  <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: px(6) }}>
                    <div style={{ fontWeight: 800, fontSize: px(14), color: '#8a6d4a' }}>Bayar TEPAT sebesar</div>
                    <button onClick={salin} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: font, color: '#c47f10', fontWeight: 800, fontSize: px(40), lineHeight: 1.05 }}>Rp {idn(qr.amount)}</button>
                    <div style={{ fontWeight: 700, fontSize: px(13), color: '#8a7a68', lineHeight: 1.35 }}>{copied ? 'Nominal disalin ✓' : 'Tap nominal untuk menyalin. 3 digit terakhir dipakai admin untuk mencocokkan pembayaranmu.'}</div>
                    <div style={{ fontWeight: 800, fontSize: px(15), marginTop: px(2), display: 'flex', alignItems: 'center', gap: px(8) }}>Dapat: <span style={{ color: '#1f7a30', display: 'inline-flex', alignItems: 'center', gap: px(6) }}>{idn(qr.total)} {THEME[qr.cur].name} {icon(qr.cur, px(22))}</span></div>
                    <div style={{ fontWeight: 700, fontSize: px(14), lineHeight: 1.5, color: '#6a5a48', marginTop: px(2) }}>
                      1. Scan QRIS dengan DANA atau e-wallet apa saja<br />
                      2. Isi nominal persis seperti di atas<br />
                      {WA_READY ? <>3. Tap “Saya sudah bayar”, WhatsApp admin terbuka, kirim screenshot bukti bayarnya<br /></> : <>3. Tap “Saya sudah bayar”<br /></>}
                      Admin mengecek lalu menambah saldo. Layar ini berubah sendiri.
                    </div>
                    {qr.claimed ? (
                      <>
                        <div style={{ fontWeight: 800, fontSize: px(16), color: '#1f7a30', marginTop: px(4) }}>✓ Menunggu persetujuan admin</div>
                        {WA_READY && <button onClick={bukaWa} style={{ width: '100%', border: 0, cursor: 'pointer', fontFamily: font, fontWeight: 800, fontSize: px(18), color: '#06301a', padding: `${px(9)}px 0`, borderRadius: px(12), background: 'linear-gradient(180deg,#3ee07a,#1fa85a)', boxShadow: `0 ${px(3)}px 0 #167a40` }}>Kirim bukti ke WhatsApp</button>}
                      </>
                    ) : (
                      <button onClick={sudahBayar} style={{ width: '100%', marginTop: px(4), border: 0, cursor: 'pointer', fontFamily: font, fontWeight: 800, fontSize: px(20), color: '#4a2f00', padding: `${px(9)}px 0`, borderRadius: px(12), background: 'linear-gradient(180deg,#ffd45a,#f5a623)', boxShadow: `0 ${px(3)}px 0 #b97a12` }}>Saya sudah bayar</button>
                    )}
                    <button onClick={() => { setQr(null); setMsg(''); }} style={{ width: '100%', border: 0, cursor: 'pointer', fontFamily: font, fontWeight: 800, fontSize: px(16), color: BROWN, padding: `${px(7)}px 0`, borderRadius: px(12), background: '#f5e6c8', boxShadow: 'inset 0 0 0 2px #e6d4b0' }}>Kembali (pesanan tetap tersimpan)</button>
                  </div>
                </div>
              )}
            </div>
          ) : (<>
          <div style={{ display: 'flex', gap: px(12) }}>
            {(['gems', 'crystal'] as TopUpCurrency[]).map((c) => (
              <button key={c} onClick={() => { if (busy) return; setCur(c); setMsg(''); }} style={tabBtn(c)}>
                {icon(c, px(30))}
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.05 }}>
                  <span>{THEME[c].name}</span>
                  <span style={{ fontSize: px(13), opacity: 0.9 }}>Saldo {idn(c === 'gems' ? gems : crystal)}</span>
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: px(6), margin: `${px(12)}px 0 ${px(10)}px` }}>
            <span style={{ fontWeight: 800, fontSize: px(14), color: t.main }}>{t.sub} · dipakai untuk:</span>
            {t.use.map((u) => (
              <span key={u} style={{ background: t.chip, color: t.main, fontWeight: 800, fontSize: px(13), borderRadius: 99, padding: `${px(2)}px ${px(10)}px` }}>{u}</span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: px(12) }}>
            {PACKS[cur].map((pk, i) => (
              <div key={pk.id} style={{ position: 'relative', borderRadius: px(18), border: `${px(3)}px solid ${t.card}`, background: t.bg, boxShadow: `0 ${px(3)}px 0 ${t.card}`, padding: `${px(14)}px ${px(10)}px ${px(10)}px`, textAlign: 'center' }}>
                {pk.tag && <span style={{ position: 'absolute', top: px(-1), left: px(-1), background: t.grad, color: '#fff', fontWeight: 800, fontSize: px(12), padding: `${px(2)}px ${px(10)}px`, borderRadius: `${px(16)}px 0 ${px(10)}px 0`, textShadow: '0 1px 0 rgba(0,0,0,.3)' }}>{pk.tag}</span>}
                <div style={{ height: px(64), display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: px(8) }}>{icon(cur, px(40 + i * 5))}</div>
                <div style={{ fontWeight: 800, fontSize: px(26), lineHeight: 1.1, color: t.main }}>{idn(pk.amount)}</div>
                <div style={{ display: 'inline-block', marginTop: px(4), background: '#dff5e3', color: '#1f7a30', border: '1.5px solid #8bd89b', fontWeight: 800, fontSize: px(13), borderRadius: 99, padding: `${px(1)}px ${px(10)}px` }}>
                  +{idn(pk.bonus)} bonus · {Math.round((pk.bonus / pk.amount) * 100)}%
                </div>
                <div style={{ fontWeight: 700, fontSize: px(13), color: '#8a7a68', margin: `${px(4)}px 0 ${px(8)}px` }}>Total {idn(pk.amount + pk.bonus)} {t.name}</div>
                <button
                  onClick={() => buy(pk)}
                  disabled={!!busy}
                  style={{ width: '100%', border: 0, cursor: busy ? 'default' : 'pointer', fontFamily: font, fontWeight: 800, fontSize: px(busy === pk.id ? 15 : 19), color: '#4a2f00', padding: `${px(7)}px 0`, borderRadius: px(10), background: 'linear-gradient(180deg,#ffd45a,#f5a623)', boxShadow: `0 ${px(3)}px 0 #b97a12`, opacity: busy && busy !== pk.id ? 0.55 : 1 }}
                >
                  {busy === pk.id ? 'Membuat pesanan…' : rupiah(pk.rupiah)}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: px(12), textAlign: 'center', fontWeight: 700, fontSize: px(12.5), color: '#8a7a68' }}>Gems dan Crystal dibeli terpisah, saldonya tidak bisa saling ditukar.</div>
          </>)}
        </div>
      </div>
    </div>
  );
}
