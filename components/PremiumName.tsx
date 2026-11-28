'use client';

import type { CSSProperties, ReactNode } from 'react';

// Nama berefek: Premium = emas berkilau, Developer = aurora neon yang bergerak dan berdenyut, Admin = merah menyala yang berkilau.
// Pengguna biasa tampil seperti teks normal.
function ensureCss() {
  if (typeof document === 'undefined' || document.getElementById('pn-css')) return;
  const s = document.createElement('style');
  s.id = 'pn-css';
  s.textContent =
    '@keyframes pnShine{0%{background-position:0% 50%}100%{background-position:200% 50%}}' +
    '@keyframes pnAurora{0%{background-position:0% 50%}100%{background-position:300% 50%}}' +
    '@keyframes pnGlow{0%,100%{filter:drop-shadow(0 0 4px rgba(167,139,250,.55))}50%{filter:drop-shadow(0 0 11px rgba(34,211,238,.9))}}' +
    '@keyframes pnRedShine{0%{background-position:0% 50%}100%{background-position:200% 50%}}' +
    '@keyframes pnRedGlow{0%,100%{filter:drop-shadow(0 0 3px rgba(229,56,59,.55))}50%{filter:drop-shadow(0 0 9px rgba(255,90,90,.95))}}' +
    '@media (prefers-reduced-motion:reduce){.pn-fx{animation:none!important}}';
  document.head.appendChild(s);
}

export default function PremiumName({ premium, dev, admin, children, style, className }: { premium?: boolean; dev?: boolean; admin?: boolean; children?: ReactNode; style?: CSSProperties; className?: string }) {
  if (!premium && !dev && !admin) return <span className={className} style={style}>{children}</span>;
  ensureCss();
  const base: CSSProperties = {
    ...style,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  };
  const fx: CSSProperties = admin
    ? {
        ...base,
        backgroundImage: 'linear-gradient(90deg,#e5383b,#ff8a8a,#ffe1e1,#ff6b6b,#b91c1c,#e5383b)',
        backgroundSize: '250% 100%',
        animation: 'pnRedShine 3s linear infinite, pnRedGlow 2.2s ease-in-out infinite',
      }
    : dev
    ? {
        ...base,
        backgroundImage: 'linear-gradient(90deg,#22d3ee,#818cf8,#e879f9,#fb7185,#fbbf24,#34d399,#22d3ee)',
        backgroundSize: '300% 100%',
        animation: 'pnAurora 5s linear infinite, pnGlow 2.6s ease-in-out infinite',
      }
    : {
        ...base,
        backgroundImage: 'linear-gradient(90deg,#f5c84b,#fff3b0,#ff9a3c,#ffe58a,#f5c84b)',
        backgroundSize: '200% 100%',
        animation: 'pnShine 3.2s linear infinite',
        filter: 'drop-shadow(0 0 6px rgba(245,200,75,.35))',
      };
  return <span className={'pn-fx ' + (className || '')} style={fx}>{children}</span>;
}
