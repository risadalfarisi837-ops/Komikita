'use client';
import { useRouter, usePathname } from 'next/navigation';

const TABS = [
  { href: '/komikstore/gacha-wallpaper', label: 'Wallpaper' },
  { href: '/komikstore/avatar-border', label: 'Border' },
];

// Tab pindah antar kategori gacha (Wallpaper / Border)
export default function GachaTabs() {
  const router = useRouter();
  const path = usePathname();
  return (
    <div className="mx-4 mb-4 flex rounded-full bg-white/5 p-1 border border-white/10">
      {TABS.map((t) => {
        const on = path.startsWith(t.href);
        return (
          <button key={t.href} onClick={() => !on && router.replace(t.href)}
            className="flex-1 py-2 rounded-full text-sm font-extrabold transition-colors"
            style={{ background: on ? '#3b82f6' : 'transparent', color: on ? '#fff' : 'rgba(255,255,255,.55)' }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
