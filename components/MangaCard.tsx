import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/lib/store';
import { useEffect, useState, memo } from 'react';
import { ScrollingTitle } from './ScrollingTitle';

interface MangaCardProps {
  title: string;
  link: string;
  thumb: string;
  desc?: string;
  large?: boolean;
  score?: string;
  flag?: string;
  chapterCount?: number;
}

function MangaCardInner({ title, link, thumb, desc, score, flag, chapterCount }: MangaCardProps) {
  const { toggleFavorite, isFavorite } = useFavorites();
  const [mounted, setMounted] = useState(false);
  const isFav = isFavorite(link);

  useEffect(() => { setMounted(true); }, []);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite({ title, link, thumb, desc });
  };

  // Parse score dari desc kalau score prop tidak ada
  const displayScore = score && score !== 'N/A'
    ? score
    : desc?.replace('Score: ', '') || 'N/A';

  const displayFlag = flag || '🇯🇵';

  return (
    <Link href={`/manga?url=${encodeURIComponent(link)}`} className="group flex flex-col w-full flex-shrink-0 snap-start relative">
      <div className="k-cover relative aspect-[4/5] w-full" style={{ borderRadius: 20 }}>
        <Image
          src={thumb}
          alt={title}
          fill
          className="object-cover"
          referrerPolicy="no-referrer"
          sizes="(max-width: 768px) 50vw, 33vw"
          unoptimized
          loading="lazy"
        />
        {/* Bendera negara */}
        <div className="absolute top-2 left-2 z-10 text-base leading-none">{displayFlag}</div>

        <button
          onClick={handleFavorite}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-[var(--card)] border-2 border-[var(--card-line)] flex items-center justify-center" style={{ boxShadow: '0 2px 0 var(--card-edge)' }}
        >
          <Heart
            className={`w-4 h-4 ${mounted && isFav ? 'fill-[#E5484D] text-[#E5484D]' : 'text-[#7C6847]'}`}
            strokeWidth={mounted && isFav ? 0 : 2.4}
          />
        </button>

        <div className="k-card-flat absolute inset-x-2 bottom-2 p-2">
          <ScrollingTitle text={title} className="font-black text-[#3B2A18] text-sm" />
          {/* Rating + Chapter count */}
          <div className="flex items-center justify-between mt-1 gap-1">
            <span className="text-[11px] text-[#D98A0B] font-extrabold flex items-center gap-0.5">
              ⭐ {displayScore !== 'N/A' ? displayScore : '—'}
            </span>
            {chapterCount !== undefined && chapterCount > 0 && (
              <span className="pixel text-[11px] text-[#7C6847] font-semibold">
                {chapterCount} Ch
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// memo supaya ga re-render kalau props sama
export const MangaCard = memo(MangaCardInner);
