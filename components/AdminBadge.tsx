// Lencana khusus Admin: rosetta merah dengan centang putih, berdenyut dan berkilau.
// Animasi ada di globals.css (.adm-badge, .adm-badge-shine) dan otomatis mati kalau perangkat minta gerakan dikurangi.
export default function AdminBadge({ size = 18 }: { size?: number }) {
  const g = 'adg' + size;
  const c = 'adc' + size;
  const shape = 'M12 1.2l2.5 1.9 3.1-.2 1.1 2.9 2.6 1.8-.9 3 .9 3-2.6 1.8-1.1 2.9-3.1-.2L12 22.8l-2.5-1.9-3.1.2-1.1-2.9-2.6-1.8.9-3-.9-3 2.6-1.8 1.1-2.9 3.1.2z';
  return (
    <svg className="adm-badge" width={size} height={size} viewBox="0 0 24 24" aria-label="Admin" role="img" style={{ flex: '0 0 auto', display: 'inline-block', verticalAlign: 'middle' }}>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6b6b" />
          <stop offset="0.5" stopColor="#e5383b" />
          <stop offset="1" stopColor="#9b111e" />
        </linearGradient>
        <clipPath id={c}><path d={shape} /></clipPath>
      </defs>
      <path d={shape} fill={'url(#' + g + ')'} />
      <g clipPath={'url(#' + c + ')'}>
        <g className="adm-badge-shine"><rect x="-8" y="-2" width="5" height="28" fill="#fff" opacity="0.55" transform="skewX(-20)" /></g>
      </g>
      <path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
