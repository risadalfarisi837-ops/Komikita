'use client';

import DevBadge from '@/components/DevBadge';
import PremiumName from '@/components/PremiumName';
import { TierPill } from '@/components/LevelPill';
import { ADMIN_TIER } from '@/lib/levelTiers';

const MUTED = '#8F8D9B';

export type StaffRole = 'Developer' | 'Admin';

// Mahkota emas kecil di pojok kanan atas avatar
function Crown({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: 'absolute', top: -9, right: -7, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.6))' }}>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#F5C84B" stroke="#B8860B" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

// Centang merah khusus Admin
function AdminCheck({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Admin" role="img" style={{ flex: '0 0 auto', display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx={12} cy={12} r={10.5} fill="#E5383B" />
      <path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Pil lencana "ADM": lingkaran bintang + pita ungu
function AdmBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 28 }}>
      <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#4b5bd6,#1c2166)', border: '2px solid #F5C84B', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="#F5C84B"><path d="M12 2l3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9z" /></svg>
      </span>
      <span style={{ marginLeft: -8, padding: '0 14px 0 14px', height: 24, display: 'inline-flex', alignItems: 'center', background: 'linear-gradient(90deg,#3b3fb0,#6a4fd6)', color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: -0.2, clipPath: 'polygon(0 0,calc(100% - 9px) 0,100% 50%,calc(100% - 9px) 100%,0 100%)', paddingRight: 20 }}>ADM</span>
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
export default function StaffHeader({ nama, foto, role = 'Developer', idText, waktu }: { nama: string; foto?: string; role?: StaffRole; idText?: string; waktu?: string }) {
  const dev = role === 'Developer';
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ position: 'relative', flex: '0 0 56px', width: 56, height: 56, borderRadius: '50%', padding: 2, boxSizing: 'border-box', background: 'linear-gradient(135deg,#F5C84B,#B8860B)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto || 'https://placehold.co/112/2A2931/fff?text=?'} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#2A2931', border: '2px solid #1B1A20', boxSizing: 'border-box', display: 'block' }} />
        <Crown />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 28 }}>
          <PremiumName dev={dev} style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{nama}</PremiumName>
          {idText && <span style={{ fontSize: 17, fontWeight: 700, color: MUTED, flex: '0 0 auto' }}>{idText}</span>}
          {dev ? <DevBadge size={24} /> : <AdminCheck />}
          {waktu && <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 700, color: MUTED, flex: '0 0 auto', whiteSpace: 'nowrap' }}>{waktu}</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          <AdmBadge />
          <TierPill tier={ADMIN_TIER} text="Lvl. ?" fontSize="15.5px" iconSize={18} style={{ height: 28, border: '1.8px solid #fff', background: 'transparent', color: '#fff', fontWeight: 800 }} />
          <span style={outline}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="#fff"><path d="M12 21s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6-8 11-8 11z" /></svg>?
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 14px', borderRadius: 99, border: '1.8px solid #F5C84B', background: dev ? 'linear-gradient(90deg,#0e7490,#6d28d9,#a21caf)' : 'linear-gradient(90deg,#B91C1C,#7f1d1d)', color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: -0.2 }}>
            {dev ? 'Developer' : 'Admin'}
          </span>
        </div>
      </div>
    </div>
  );
}
