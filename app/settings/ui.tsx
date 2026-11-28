'use client';

import { createContext, useCallback, useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

// ─── Warna (diambil dari video referensi) ────────────────────────────────────
export const BG = '#151619';
export const CARD = '#202124';
export const LINE = '#2E2F32';
export const TXT = '#CCCAD1';       // teks baris
export const HEAD = '#CEC9D6';      // judul bagian
export const MUTED = '#9EA0A3';     // ID dan email
export const VAL = '#E6E5EA';       // teks On/Off
export const RED = '#F44336';
const BLUE = '#2092EE';
const BLUE_TRACK = '#224664';
const OFF_THUMB = '#B6B5B8';
const OFF_TRACK = '#656467';
export const FONT = "'Montserrat', var(--font-jakarta), sans-serif";

// ─── Satuan ───────────────────────────────────────────────────────────────────
// Semua ukuran di bawah ini memakai piksel video referensi (lebar 720).
// p(n) mengubahnya ke px layar sesuai lebar layar, jadi proporsinya selalu sama persis dengan video.
export const UnitCtx = createContext(0.5);
export const useP = () => {
  const u = useContext(UnitCtx);
  return useCallback((n: number) => Math.round(n * u * 100) / 100, [u]);
};

// ─── Komponen kecil ───────────────────────────────────────────────────────────
export function Switch({ on }: { on: boolean }) {
  const p = useP();
  return (
    <span aria-hidden style={{ position: 'relative', display: 'block', width: p(68), height: p(34), flexShrink: 0 }}>
      <span style={{ position: 'absolute', left: p(14), top: p(5), width: p(40), height: p(24), borderRadius: p(12), background: on ? BLUE_TRACK : OFF_TRACK, transition: 'background .18s' }} />
      <span style={{ position: 'absolute', top: 0, left: on ? p(34) : 0, width: p(34), height: p(34), borderRadius: '50%', background: on ? BLUE : OFF_THUMB, boxShadow: '0 1px 3px rgba(0,0,0,.4)', transition: 'left .18s, background .18s' }} />
    </span>
  );
}

interface RowProps {
  title: string;
  value?: ReactNode;
  chevron?: boolean;
  toggle?: { on: boolean; onChange: (v: boolean) => void };
  onClick?: () => void;
  href?: string;
}

// Satu baris = satu kartu bulat penuh (tinggi 68,5 biasa, 98 kalau ada switch)
export function Row({ title, value, chevron, toggle, onClick, href }: RowProps) {
  const p = useP();
  const style: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: p(16), width: '100%', boxSizing: 'border-box',
    height: p(toggle ? 98 : 68.5), padding: `0 ${p(toggle ? 35 : 28)}px 0 ${p(28)}px`,
    borderRadius: 999, background: CARD, color: 'inherit', textDecoration: 'none', border: 0,
    font: 'inherit', textAlign: 'left', margin: 0, WebkitTapHighlightColor: 'transparent',
    cursor: toggle || onClick || href ? 'pointer' : 'default',
  };
  const inner = (
    <>
      <span style={{ flex: 1, minWidth: 0, fontSize: p(22.8), fontWeight: 500, lineHeight: 1.25, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      {value != null && <span style={{ flexShrink: 0, fontSize: p(22.4), fontWeight: 500, lineHeight: 1.25, color: '#fff' }}>{value}</span>}
      {toggle && (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ width: p(41), fontSize: p(23), fontWeight: 500, lineHeight: 1.25, color: VAL }}>{toggle.on ? 'On' : 'Off'}</span>
          <Switch on={toggle.on} />
        </span>
      )}
      {chevron && <ChevronRight size={p(34)} strokeWidth={2.2} color="#8F9093" style={{ flexShrink: 0, marginRight: -p(8) }} />}
    </>
  );
  if (href) return <Link href={href} style={style}>{inner}</Link>;
  if (toggle) return <button role="switch" aria-checked={toggle.on} onClick={() => toggle.onChange(!toggle.on)} style={style}>{inner}</button>;
  if (onClick) return <button onClick={onClick} style={style}>{inner}</button>;
  return <div style={style}>{inner}</div>;
}

// Judul bagian + daftar kartu
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const p = useP();
  return (
    <section style={{ marginTop: p(42) }}>
      <div style={{ fontSize: p(27.4), fontWeight: 800, lineHeight: 1, color: HEAD, marginBottom: p(16.5) }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: p(14) }}>{children}</div>
    </section>
  );
}

// Tombol pil kecil (Bagikan / Laporkan Bug)
export function Pill({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  const p = useP();
  return (
    <button onClick={onClick} style={{ height: p(68.5), padding: `0 ${p(28)}px`, borderRadius: 999, border: 0, background: CARD, color: TXT, font: 'inherit', fontSize: p(22.8), fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent' }}>{children}</button>
  );
}
