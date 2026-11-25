'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Matikan zoom cubit bawaan browser di seluruh aplikasi, supaya tampilan tidak ikut membesar.
// Pengecualian: pembaca chapter (/chapter) tetap boleh di-zoom untuk membaca panel komik.
// Game Mancing punya zoom sendiri (cubit di dalam game).
export default function NoPageZoom() {
  const path = usePathname() || '';
  useEffect(() => {
    const allow = path.startsWith('/chapter');
    const v = allow ? '' : 'pan-x pan-y';
    document.documentElement.style.touchAction = v;
    document.body.style.touchAction = v;
  }, [path]);
  return null;
}
