import type { ReactNode } from 'react';
import { Nunito } from 'next/font/google';

const nunito = Nunito({ subsets: ['latin'], weight: ['600', '700', '800', '900'] });

export default function PetLayout({ children }: { children: ReactNode }) {
  return (
    <div className={'fixed inset-0 overflow-y-auto overflow-x-hidden ' + nunito.className} style={{ background: '#7acb5e' }}>
      {children}
    </div>
  );
}
