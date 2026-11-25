import type { ReactNode } from 'react';

// Menu KomikStore tetap mode HP (portrait). Mode game ada di app/komikstore/mancing/layout.tsx.
export default function KomikStoreLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
