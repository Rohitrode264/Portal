/**
 * Inline SVG illustration components for the portal.
 * All illustrations are theme-aware via CSS currentColor / opacity.
 */

/** Hero: Student studying at desk with books and laptop */

export function StudyingIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background glow */}
      <circle cx="240" cy="80" r="70" fill="#D1FAE5" opacity="0.25" />
      <circle cx="80" cy="130" r="50" fill="#FDE68A" opacity="0.25" />

      {/* Desk */}
      <rect x="20" y="148" width="280" height="10" rx="5" fill="#374151" opacity="0.12" />

      {/* Chalkboard */}
      <rect x="40" y="40" width="240" height="80" rx="6" fill="#1F2937" />
      <text x="60" y="65" fill="#E5E7EB" fontSize="8" fontFamily="monospace">
        x² + 4 = 6
      </text>
      <text x="60" y="80" fill="#E5E7EB" fontSize="8" fontFamily="monospace">
        x² = 12
      </text>
      <text x="60" y="95" fill="#E5E7EB" fontSize="8" fontFamily="monospace">
        V = 1/3πr²h
      </text>
      <path d="M200 60 L220 60 L220 80 L200 80 Z" stroke="#E5E7EB" strokeWidth="1" />
      <path d="M210 60 L210 80" stroke="#E5E7EB" strokeWidth="1" />

      {/* Students */}
      {/* Left student */}
      <circle cx="110" cy="110" r="18" fill="#FBBF24" />
      <path d="M92 100 Q94 85 110 83 Q126 85 128 100" fill="#111827" />
      <circle cx="104" cy="107" r="2.5" fill="#111827" />
      <circle cx="116" cy="107" r="2.5" fill="#111827" />
      <path d="M104 114 Q110 118 116 114" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
      <path d="M90 120 Q80 125 78 140" stroke="#FBBF24" strokeWidth="8" strokeLinecap="round" />
      <path d="M130 120 Q140 125 142 140" stroke="#FBBF24" strokeWidth="8" strokeLinecap="round" />
      <path d="M95 140 Q100 120 125 120 Q130 140 95 140" fill="#4F46E5" opacity="0.8" />

      {/* Right student */}
      <circle cx="210" cy="110" r="18" fill="#FBBF24" />
      <path d="M192 100 Q194 85 210 83 Q226 85 228 100" fill="#111827" />
      <circle cx="204" cy="107" r="2.5" fill="#111827" />
      <circle cx="216" cy="107" r="2.5" fill="#111827" />
      <path d="M204 114 Q210 118 216 114" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
      <path d="M190 140 Q195 120 220 120 Q225 140 190 140" fill="#6366F1" opacity="0.8" />

      {/* Books and cup */}
      <rect x="60" y="130" width="26" height="22" rx="5" fill="#4F46E5" opacity="0.2" />
      <rect x="40" y="120" width="20" height="10" rx="3" fill="#818CF8" opacity="0.7" />
      <rect x="40" y="110" width="20" height="8" rx="3" fill="#6366F1" opacity="0.8" />

      {/* Floating icons */}
      <circle cx="280" cy="50" r="8" fill="#4ADE80" opacity="0.3" />
      <path d="M276 50 L279 53 L284 46" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="60" r="5" fill="#FBBF24" opacity="0.4" />
      <circle cx="295" cy="100" r="4" fill="#F9A8D4" opacity="0.4" />
    </svg>
  );
}


/** Empty state: No exams clipboard */
export function EmptyExamsIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Clipboard body */}
      <rect x="36" y="24" width="88" height="100" rx="8" fill="currentColor" opacity="0.07" />
      <rect x="36" y="24" width="88" height="100" rx="8" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
      {/* Clip */}
      <rect x="60" y="16" width="40" height="18" rx="9" fill="currentColor" opacity="0.12" />
      <rect x="60" y="16" width="40" height="18" rx="9" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      {/* Lines */}
      <rect x="50" y="50" width="60" height="5" rx="2.5" fill="currentColor" opacity="0.12" />
      <rect x="50" y="63" width="46" height="5" rx="2.5" fill="currentColor" opacity="0.10" />
      <rect x="50" y="76" width="52" height="5" rx="2.5" fill="currentColor" opacity="0.10" />
      <rect x="50" y="89" width="38" height="5" rx="2.5" fill="currentColor" opacity="0.08" />
      {/* Big question mark */}
      <text x="80" y="118" textAnchor="middle" fontSize="22" fill="currentColor" opacity="0.15" fontWeight="700">?</text>
      {/* Clock overlay */}
      <circle cx="112" cy="106" r="22" fill="currentColor" opacity="0.06" />
      <circle cx="112" cy="106" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
      <line x1="112" y1="96" x2="112" y2="106" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="112" y1="106" x2="120" y2="110" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

/** Celebration trophy for completed exams */
export function TrophyIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Glow */}
      <circle cx="80" cy="68" r="48" fill="#FBBF24" opacity="0.08" />
      {/* Trophy cup */}
      <path d="M52 28 L52 74 Q52 90 80 90 Q108 90 108 74 L108 28 Z" fill="#FBBF24" opacity="0.8" />
      <path d="M55 28 L55 72 Q55 87 80 87 Q105 87 105 72 L105 28 Z" fill="#FCD34D" opacity="0.5" />
      {/* Handles */}
      <path d="M52 40 Q36 40 36 54 Q36 68 52 68" stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M108 40 Q124 40 124 54 Q124 68 108 68" stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* Stem */}
      <rect x="72" y="90" width="16" height="20" rx="3" fill="#FBBF24" opacity="0.6" />
      {/* Base */}
      <rect x="58" y="108" width="44" height="10" rx="5" fill="#FBBF24" opacity="0.7" />
      {/* Star on cup */}
      <path d="M80 46 L83 56 L93 56 L85 62 L88 72 L80 66 L72 72 L75 62 L67 56 L77 56 Z" fill="white" opacity="0.6" />
      {/* Sparkles */}
      <circle cx="38" cy="30" r="4" fill="#818CF8" opacity="0.4" />
      <circle cx="122" cy="28" r="3" fill="#4ADE80" opacity="0.5" />
      <path d="M130 50 L132 56 L138 58 L132 60 L130 66 L128 60 L122 58 L128 56 Z" fill="#FBBF24" opacity="0.4" />
      <path d="M22 52 L24 58 L30 60 L24 62 L22 68 L20 62 L14 60 L20 58 Z" fill="#F9A8D4" opacity="0.5" />
    </svg>
  );
}

/** Calendar empty state */
export function CalendarEmptyIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="20" y="28" width="120" height="100" rx="10" fill="currentColor" opacity="0.06" />
      <rect x="20" y="28" width="120" height="100" rx="10" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      {/* Header bar */}
      <rect x="20" y="28" width="120" height="28" rx="10" fill="currentColor" opacity="0.08" />
      <rect x="20" y="46" width="120" height="10" fill="currentColor" opacity="0.08" />
      {/* Pin circles */}
      <circle cx="46" cy="22" r="6" fill="currentColor" opacity="0.15" />
      <circle cx="114" cy="22" r="6" fill="currentColor" opacity="0.15" />
      {/* Day grid */}
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i} x={28 + i * 16} y="62" width="10" height="6" rx="3" fill="currentColor" opacity="0.08" />
      ))}
      {[0,1,2,3,4,5].map(row => [0,1,2,3,4,5,6].map(col => (
        <rect key={`${row}-${col}`} x={28 + col * 16} y={74 + row * 12} width="10" height="6" rx="3" fill="currentColor" opacity="0.06" />
      )))}
      {/* One highlighted cell */}
      <rect x="76" y="86" width="10" height="6" rx="3" fill="#4F46E5" opacity="0.4" />
      {/* Dots */}
      <circle cx="134" cy="110" r="10" fill="#818CF8" opacity="0.15" />
      <circle cx="26" cy="115" r="7" fill="#4ADE80" opacity="0.2" />
    </svg>
  );
}
