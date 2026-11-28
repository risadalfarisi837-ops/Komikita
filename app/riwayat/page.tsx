'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useHistory, HistoryItem } from '@/lib/store';

const BG = '#1B1A20', CARD = '#26252C', MUTED = '#8F8D9B', RED = '#E5252A', BLUE = '#2F6BFF';
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
const MON_S = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const dayKey = (ts: number) => { const d = new Date(ts); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
const dayLabel = (ts: number) => { const d = new Date(ts); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
const shortDate = (ts: number) => { const d = new Date(ts); return d.getDate() + ' ' + MON_S[d.getMonth()]; };
const hhmm = (ts: number) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const chNum = (h: HistoryItem) => (h.chapterNumber || h.chapterTitle || '').toString().replace(/^ch(apter)?\.?\s*/i, '').trim();
const chLabel = (h: HistoryItem) => { const n = chNum(h); return n ? 'Chapter ' + n : 'Chapter'; };
const readHref = (h: HistoryItem) => '/chapter?url=' + encodeURIComponent(h.chapterLink) + '&thumb=' + encodeURIComponent(h.mangaThumb || '') + '&mangaTitle=' + encodeURIComponent(h.mangaTitle || '');
const pctOf = (h: HistoryItem) => (h.totalPages > 0 ? Math.min(100, Math.round((h.pageRead / h.totalPages) * 100)) : 0);
const clamp2: React.CSSProperties = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

type Row = { key: string; h: HistoryItem; left: string; right: string; pct: number; links: string[] };

const ClockIco = ({ size = 14, color = '#fff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

export default function RiwayatPage() {
  const { history, removeHistory } = useHistory();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => setMounted(true), []);

  const list = mounted ? history : [];
  const first = list[0];

  const rows: Row[] = useMemo(() => {
    if (mode === 'single') {
      return list.map((h) => ({ key: h.chapterLink, h, left: chLabel(h), right: h.totalPages > 0 ? h.pageRead + ' / ' + h.totalPages + ' hal' : '', pct: pctOf(h), links: [h.chapterLink] }));
    }
    const m = new Map<string, HistoryItem[]>();
    list.forEach((h) => { const a = m.get(h.mangaLink) || []; a.push(h); m.set(h.mangaLink, a); });
    return Array.from(m.entries()).map(([k, a]) => {
      const h = a[0];
      return { key: k, h, left: a.length + ' chapter dibaca', right: 'Terakhir ' + chLabel(h), pct: pctOf(h), links: a.map((x) => x.chapterLink) };
    });
  }, [list, mode]);

  const groups = useMemo(() => {
    const out: { k: string; label: string; rows: Row[] }[] = [];
    rows.forEach((r) => {
      const k = dayKey(r.h.readAt);
      const g = out[out.length - 1];
      if (g && g.k === k) g.rows.push(r); else out.push({ k, label: dayLabel(r.h.readAt), rows: [r] });
    });
    return out;
  }, [rows]);

  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const stopSelect = () => { setSelecting(false); setPicked([]); };
  const removePicked = () => {
    rows.filter((r) => picked.includes(r.key)).forEach((r) => r.links.forEach((l) => removeHistory(l)));
    stopSelect();
  };

  const remain = first && first.totalPages > 0 ? first.totalPages - first.pageRead : 0;

  return (
    <div style={{ background: BG, color: '#fff', minHeight: '100vh', padding: '18px 18px 130px' }}>
      <style>{`a{text-decoration:none;color:inherit} button{font-family:inherit;cursor:pointer}`}</style>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -1 }}>Riwayat</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', padding: 4, borderRadius: 99, background: '#131318', border: '1px solid rgba(255,255,255,.08)' }}>
            {(['single', 'multi'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{ border: 0, borderRadius: 99, padding: '9px 17px', fontSize: 14, fontWeight: 800, background: mode === m ? BLUE : 'transparent', color: mode === m ? '#fff' : MUTED, transition: 'background .2s' }}>{m === 'single' ? 'Single' : 'Multi'}</button>
            ))}
          </div>
          <button onClick={() => (selecting ? stopSelect() : setSelecting(true))} aria-label="Pilih" style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,.1)', background: selecting ? BLUE : CARD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" /><path d="M8 12.2l3 3 5-6" /></svg>
          </button>
        </div>
      </div>

      {list.length === 0 && mounted && (
        <div style={{ textAlign: 'center', color: MUTED, fontWeight: 700, fontSize: 15, lineHeight: 1.6, marginTop: 120 }}>
          Belum ada riwayat baca.<br />Chapter yang kamu baca akan muncul di sini.
        </div>
      )}

      {/* lanjutkan */}
      {first && !selecting && (
        <Link href={readHref(first)} style={{ display: 'block', position: 'relative', marginTop: 18, aspectRatio: '995 / 462', borderRadius: 22, overflow: 'hidden', background: CARD }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img decoding="async" src={first.mangaThumb} alt="" referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.82) 0%, rgba(0,0,0,.25) 42%, rgba(0,0,0,0) 70%)' }} />
          <span style={{ position: 'absolute', top: 14, left: 16, fontSize: 12.5, fontWeight: 800, letterSpacing: 0.6, background: 'rgba(0,0,0,.4)', padding: '6px 12px', borderRadius: 8 }}>LANJUTKAN</span>
          <div style={{ position: 'absolute', left: 18, right: 86, bottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.15, ...clamp2 }}>{first.mangaTitle}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 13, fontWeight: 600, color: '#E6E4EE' }}>
              <ClockIco size={14} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortDate(first.readAt)} · {chLabel(first)}{remain > 0 ? ' · sisa ' + remain + ' halaman' : ''}</span>
            </div>
          </div>
          <span style={{ position: 'absolute', right: 16, bottom: 18, width: 54, height: 54, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="#111"><path d="M8 5.5v13l11-6.5z" /></svg>
          </span>
          <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(255,255,255,.18)' }}>
            <div style={{ width: pctOf(first) + '%', height: '100%', background: RED }} />
          </div>
        </Link>
      )}

      {/* per tanggal */}
      {groups.map((g) => (
        <div key={g.k}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 16px' }}>
            <span style={{ width: 3.5, height: 17, borderRadius: 2, background: RED }} />
            <span style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: 1.4 }}>{g.label}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {g.rows.map((r) => {
              const on = picked.includes(r.key);
              const body = (
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', opacity: selecting && !on ? 0.65 : 1, transition: 'opacity .15s' }}>
                  <div style={{ position: 'relative', flex: '0 0 72px', width: 72, height: 101, borderRadius: 14, overflow: 'hidden', background: CARD }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img decoding="async" loading="lazy" src={r.h.mangaThumb} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {selecting && (
                      <span style={{ position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: '50%', background: on ? BLUE : 'rgba(0,0,0,.55)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {on && <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.25, paddingTop: 2, ...clamp2 }}>{r.h.mangaTitle}</div>
                      <span style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 5, background: '#131318', borderRadius: 99, padding: '6px 11px', fontSize: 14, fontWeight: 700 }}>
                        <ClockIco size={13} />{hhmm(r.h.readAt)}
                      </span>
                    </div>
                    <div style={{ marginTop: 9, background: CARD, borderRadius: 16, padding: '12px 14px 11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13.5 }}>
                        <span style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.left}</span>
                        <span style={{ color: MUTED, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.right}</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.14)', marginTop: 9 }}>
                        <div style={{ width: r.pct + '%', height: '100%', borderRadius: 2, background: RED }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
              return selecting
                ? <div key={r.key} onClick={() => toggle(r.key)} style={{ cursor: 'pointer' }}>{body}</div>
                : <Link key={r.key} href={readHref(r.h)} style={{ display: 'block' }}>{body}</Link>;
            })}
          </div>
        </div>
      ))}

      {/* bar hapus saat mode pilih */}
      {selecting && (
        <div style={{ position: 'sticky', bottom: 84, zIndex: 20, marginTop: 26, display: 'flex', gap: 10 }}>
          <button onClick={stopSelect} style={{ flex: 1, border: '1px solid rgba(255,255,255,.12)', background: CARD, color: '#fff', borderRadius: 99, padding: '14px 0', fontSize: 15, fontWeight: 800 }}>Batal</button>
          <button onClick={removePicked} disabled={picked.length === 0} style={{ flex: 2, border: 0, background: picked.length ? RED : '#4A2A2C', color: '#fff', borderRadius: 99, padding: '14px 0', fontSize: 15, fontWeight: 800, opacity: picked.length ? 1 : 0.7 }}>Hapus{picked.length ? ' (' + picked.length + ')' : ''}</button>
        </div>
      )}
    </div>
  );
}
