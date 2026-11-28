'use client';

import DevBadge from '@/components/DevBadge';
import AdminBadge from '@/components/AdminBadge';
import PremiumName from '@/components/PremiumName';
import { TierPill } from '@/components/LevelPill';
import { ADMIN_TIER } from '@/lib/levelTiers';

const MUTED = '#8F8D9B';

export type StaffRole = 'Developer' | 'Admin';

// Mahkota emas kecil di pojok kanan atas avatar
function Crown({ size = 22, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <svg className="adm-crown" width={size} height={size} viewBox="0 0 24 24" style={{ position: 'absolute', top: compact ? -7 : -9, right: compact ? -5 : -7, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.6))' }}>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#F5C84B" stroke="#B8860B" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

// Pil lencana "ADM": lingkaran bintang + pita ungu
function AdmBadge({ compact = false }: { compact?: boolean }) {
  const c = (a: number, b: number) => (compact ? b : a);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: c(28, 22) }}>
      <span className="adm-ring" style={{ width: c(30, 23), height: c(30, 23), borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#4b5bd6,#1c2166)', border: '2px solid #F5C84B', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <svg width={c(16, 12)} height={c(16, 12)} viewBox="0 0 24 24" fill="#F5C84B"><path d="M12 2l3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9z" /></svg>
      </span>
      <span className="tier-shine adm-d1" style={{ marginLeft: c(-8, -6), padding: compact ? '0 15px 0 11px' : '0 14px 0 14px', height: c(24, 18), display: 'inline-flex', alignItems: 'center', background: 'linear-gradient(90deg,#3b3fb0,#6a4fd6)', color: '#fff', fontSize: c(15, 12.5), fontWeight: 800, letterSpacing: -0.2, clipPath: compact ? 'polygon(0 0,calc(100% - 7px) 0,100% 50%,calc(100% - 7px) 100%,0 100%)' : 'polygon(0 0,calc(100% - 9px) 0,100% 50%,calc(100% - 9px) 100%,0 100%)', paddingRight: c(20, 15) }}>ADM</span>
    </span>
  );
}

const outline = {
  display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 11px 0 8px', borderRadius: 99,
  border: '1.8px solid #fff', color: '#fff', fontSize: 15.5, fontWeight: 800, letterSpacing: -0.2, whiteSpace: 'nowrap' as const,
};

/**
 * Header profil untuk pesan dari Developer / Admin (Info & Hadiah di Notifikasi).
 * Avatar bermahkota, nama + ID, centang, lalu baris pil: ADM · Lvl. ? · ♥ ? · peran.
 */
export default function StaffHeader({ nama, foto, role = 'Developer', idText, waktu, compact = false, menu }: { nama: string; foto?: string; role?: StaffRole; idText?: string; waktu?: string; compact?: boolean; menu?: React.ReactNode }) {
  const dev = role === 'Developer';
  const c = (a: number, b: number) => (compact ? b : a);
  const av = c(56, 46);
  const pillH = c(28, 22);
  return (
    <div style={{ display: 'flex', gap: c(12, 10), alignItems: 'flex-start' }}>
      <span style={{ position: 'relative', flex: `0 0 ${av}px`, width: av, height: av, borderRadius: '50%', padding: 2, boxSizing: 'border-box', background: 'linear-gradient(135deg,#F5C84B,#B8860B)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto || 'https://placehold.co/112/2A2931/fff?text=?'} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#2A2931', border: '2px solid #1B1A20', boxSizing: 'border-box', display: 'block' }} />
        <Crown size={c(22, 17)} compact={compact} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: c(8, 6), minHeight: pillH }}>
          <PremiumName dev={dev} style={{ fontSize: c(20, 14.5), fontWeight: 800, letterSpacing: -0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{nama}</PremiumName>
          {idText && <span style={{ fontSize: c(17, 12.5), fontWeight: 700, color: MUTED, flex: '0 0 auto' }}>{idText}</span>}
          {dev ? <DevBadge size={c(24, 18)} /> : <AdminBadge size={c(24, 18)} />}
          {waktu && <span style={{ marginLeft: 'auto', fontSize: c(15, 12.5), fontWeight: 600, color: MUTED, flex: '0 0 auto', whiteSpace: 'nowrap' }}>{waktu}</span>}
          {menu}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: c(6, 5) }}>
          <AdmBadge compact={compact} />
          <TierPill tier={ADMIN_TIER} shine delay={1} text="Lvl. ?" fontSize={compact ? '12.5px' : '15.5px'} iconSize={c(18, 14)} style={{ height: pillH, border: compact ? '1.5px solid #fff' : '1.8px solid #fff', background: 'transparent', color: '#fff', fontWeight: 800 }} />
          <span className="tier-shine adm-d2" style={compact ? { ...outline, height: 22, padding: '0 9px 0 6px', gap: 3, fontSize: 12.5, borderWidth: 1.5 } : outline}>
            <svg width={c(16, 13)} height={c(16, 13)} viewBox="0 0 24 24" fill="#fff"><path d="M12 21s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6-8 11-8 11z" /></svg>?
          </span>
          <span className={dev ? 'tier-shine adm-d3' : 'tier-shine adm-ring adm-d3'} style={{ display: 'inline-flex', alignItems: 'center', height: pillH, padding: compact ? '0 11px' : '0 14px', borderRadius: 99, border: compact ? '1.5px solid #F5C84B' : '1.8px solid #F5C84B', background: dev ? 'linear-gradient(90deg,#0e7490,#6d28d9,#a21caf)' : 'linear-gradient(90deg,#B91C1C,#7f1d1d)', color: '#fff', fontSize: c(16, 12.5), fontWeight: 800, letterSpacing: -0.2 }}>
            {dev ? 'Developer' : 'Admin'}
          </span>
        </div>
      </div>
    </div>
  );
}
