'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { TOPUP_PACKS as PACKS } from '@/lib/topupPacks';
import type { QrOrder, TopUpCurrency, TopUpPoll } from '@/lib/topupPacks';
export type { TopUpCurrency };

type BuyResult = string | QrOrder | void | Promise<string | QrOrder | void>;

interface Props {
  px: (n: number) => number;
  font: string;
  initial?: TopUpCurrency;
  gems: number;
  crystal: number;
  gemIcon: (size: number) => ReactNode;
  crystalIcon: (size: number) => ReactNode;
  onClose: () => void;
  /** Dipanggil saat tombol harga ditekan. Kembalikan teks error kalau gagal; kosong = berhasil (halaman pindah ke pembayaran). */
  onBuy?: (currency: TopUpCurrency, packId: string, amount: number, bonus: number, rupiah: number) => BuyResult;
  /** Cek status pembayaran QRIS. */
  onPoll?: (orderId: string) => Promise<TopUpPoll>;
  /** Dipanggil saat pembayaran lunas (muat ulang saldo). */
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

export default function ShopTopUp({ px, font, initial = 'gems', gems, crystal, gemIcon, crystalIcon, onClose, onBuy, onPoll, onPaid }: Props) {
  const [cur, setCur] = useState<TopUpCurrency>(initial);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [qr, setQr] = useState<(QrOrder & { cur: TopUpCurrency; total: number }) | null>(null);
  const [paid, setPaid] = useState(false);
  const paidRef = useRef(false);
  const t = THEME[cur];

  // cek status QRIS tiap 3 detik selama kode QR tampil
  useEffect(() => {
    if (!qr || paid || !onPoll) return;
    let stop = false;
    const tick = async () => {
      try {
        const st = await onPoll(qr.orderId);
        if (stop) return;
        if (st === 'paid' && !paidRef.current) { paidRef.current = true; setPaid(true); onPaid?.(); }
        else if (st === 'failed') { setQr(null); setMsg('Pembayaran dibatalkan atau kedaluwarsa. Coba lagi.'); }
      } catch { /* abaikan, coba lagi di putaran berikutnya */ }
    };
    const id = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(id); };
  }, [qr, paid, onPoll, onPaid]);
  const icon = (c: TopUpCurrency, s: number) => (c === 'gems' ? gemIcon(s) : crystalIcon(s));

  const buy = async (pk: (typeof PACKS)[TopUpCurrency][number]) => {
    if (busy) return;
    setMsg('');
    if (!onBuy) { setMsg('Pembayaran Rupiah belum tersedia'); return; }
    setBusy(pk.id);
    try {
      const err = await onBuy(cur, pk.id, pk.amount, pk.bonus, pk.rupiah);
      if (typeof err === 'string' && err) { setMsg(err); setBusy(''); return; }
      if (err && typeof err === 'object' && 'qrUrl' in err) { paidRef.current = false; setPaid(false); setQr({ ...err, cur, total: pk.amount + pk.bonus }); setBusy(''); return; }
      // berhasil: halaman akan pindah ke Midtrans. Kalau tidak pindah, buka lagi tombolnya.
      setTimeout(() => setBusy(''), 10000);
    } catch {
      setMsg('Gagal membuat pembayaran');
      setBusy('');
    }
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

        {msg && !qr && <div style={{ flex: 'none', background: '#fde4df', color: '#9c2a18', borderBottom: '2px solid #f3b4a8', textAlign: 'center', fontWeight: 800, fontSize: px(15), padding: `${px(8)}px ${px(12)}px` }}>{msg}</div>}
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
                <>
                  <div style={{ fontWeight: 800, fontSize: px(22), color: THEME[qr.cur].main }}>Scan QRIS · {rupiah(qr.rupiah)}</div>
                  <div style={{ fontWeight: 700, fontSize: px(14), color: '#8a7a68' }}>{idn(qr.total)} {THEME[qr.cur].name}</div>
                  <div style={{ background: '#fff', borderRadius: px(14), padding: px(8), border: `${px(3)}px solid ${THEME[qr.cur].card}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr.qrUrl} alt="QRIS" style={{ width: px(250), height: px(250), display: 'block', imageRendering: 'pixelated' }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: px(13), color: '#8a7a68', maxWidth: px(520) }}>Buka GoPay, Dana, ShopeePay, OVO atau m-banking lalu scan. Kalau satu HP, screenshot kode ini dan pilih dari galeri di aplikasi pembayarannya.</div>
                  <div style={{ fontWeight: 800, fontSize: px(14), color: '#a8691f' }}>Menunggu pembayaran… saldo masuk otomatis</div>
                  <button onClick={() => { setQr(null); setMsg(''); }} style={{ border: 0, cursor: 'pointer', fontFamily: font, fontWeight: 800, fontSize: px(16), color: BROWN, padding: `${px(6)}px ${px(28)}px`, borderRadius: px(12), background: '#f5e6c8', boxShadow: 'inset 0 0 0 2px #e6d4b0' }}>Batal</button>
                </>
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
                  {busy === pk.id ? 'Membuka pembayaran…' : rupiah(pk.rupiah)}
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
