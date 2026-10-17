// Doka, la tortuga meditando. Flat, minimalista y con varias poses.
import type { ReactNode } from 'react';

export type TurtlePose = 'meditate' | 'celebrate' | 'read' | 'rest' | 'wave';

const SKIN = '#8DD5F8';
const SKIN_DARK = '#5DBBEF';
const SHELL = '#2F97DC';
const SHELL_RIM = '#287CB5';
const BELLY = '#E3F4FD';

export function Turtle({ pose = 'meditate', size = 120, animated = true, className }: { pose?: TurtlePose; size?: number; animated?: boolean; className?: string }) {
  const arms: Record<TurtlePose, ReactNode> = {
    meditate: (
      <>
        <path d="M58 104 C40 118 38 140 56 150" stroke={SKIN} strokeWidth="15" strokeLinecap="round" fill="none" />
        <path d="M142 104 C160 118 162 140 144 150" stroke={SKIN} strokeWidth="15" strokeLinecap="round" fill="none" />
        <circle cx="58" cy="151" r="9" fill={SKIN} />
        <circle cx="142" cy="151" r="9" fill={SKIN} />
      </>
    ),
    celebrate: (
      <>
        <path d="M60 102 C44 88 38 70 40 52" stroke={SKIN} strokeWidth="15" strokeLinecap="round" fill="none" />
        <path d="M140 102 C156 88 162 70 160 52" stroke={SKIN} strokeWidth="15" strokeLinecap="round" fill="none" />
        <circle cx="40" cy="48" r="9" fill={SKIN} />
        <circle cx="160" cy="48" r="9" fill={SKIN} />
        <g fill="#F7C548">
          <path d="M26 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
          <path d="M174 24l2.5 5.5 5.5 2.5-5.5 2.5-2.5 5.5-2.5-5.5-5.5-2.5 5.5-2.5z" />
          <circle cx="100" cy="14" r="4" />
        </g>
      </>
    ),
    read: (
      <>
        <path d="M58 106 C50 120 62 130 76 128" stroke={SKIN} strokeWidth="15" strokeLinecap="round" fill="none" />
        <path d="M142 106 C150 120 138 130 124 128" stroke={SKIN} strokeWidth="15" strokeLinecap="round" fill="none" />
        <path d="M70 112 L100 120 L130 112 L130 142 L100 150 L70 142Z" fill="#fff" stroke={SHELL_RIM} strokeWidth="3" strokeLinejoin="round" />
        <path d="M100 120 V150" stroke={SHELL_RIM} strokeWidth="3" />
      </>
    ),
    rest: (
      <>
        <path d="M58 104 C44 118 44 138 60 146" stroke={SKIN} strokeWidth="15" strokeLinecap="round" fill="none" />
        <path d="M142 104 C156 118 156 138 140 146" stroke={SKIN} strokeWidth="15" strokeLinecap="round" fill="none" />
        <g fill={SHELL_RIM} fontFamily="Nunito, sans-serif" fontWeight="900">
          <text x="140" y="34" fontSize="18">z</text>
          <text x="154" y="22" fontSize="13">z</text>
        </g>
      </>
    ),
    wave: (
      <>
        <path d="M58 104 C40 118 38 140 56 150" stroke={SKIN} strokeWidth="15" strokeLinecap="round" fill="none" />
        <circle cx="58" cy="151" r="9" fill={SKIN} />
        <path d="M140 102 C158 92 166 74 162 58" stroke={SKIN} strokeWidth="15" strokeLinecap="round" fill="none" />
        <circle cx="162" cy="54" r="9" fill={SKIN} />
      </>
    ),
  };

  const eyesOpen = pose === 'wave' || pose === 'celebrate';

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} role="img" aria-label="Doka, la tortuga de Dokapp">
      <ellipse cx="100" cy="182" rx="62" ry="7" fill="#287CB5" opacity=".08" />
      <g className={animated && pose === 'meditate' ? 'breathe' : animated && pose === 'celebrate' ? 'float' : undefined}>
        {/* Piernas cruzadas */}
        <path d="M38 166 C60 142 140 142 162 166 C140 182 60 182 38 166Z" fill={SKIN} />
        <path d="M70 168 C88 160 112 160 130 168" stroke={SKIN_DARK} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".6" />
        {/* Caparazón y vientre */}
        <ellipse cx="100" cy="118" rx="54" ry="50" fill={SHELL} />
        <ellipse cx="100" cy="118" rx="54" ry="50" fill="none" stroke={SHELL_RIM} strokeWidth="4" opacity=".5" />
        <ellipse cx="100" cy="124" rx="36" ry="38" fill={BELLY} />
        <path d="M74 112 H126 M70 132 H130 M100 88 V160" stroke="#C3E6F9" strokeWidth="3" strokeLinecap="round" />
        {arms[pose]}
        {/* Cabeza */}
        <circle cx="100" cy="60" r="31" fill={SKIN} />
        <circle cx="78" cy="68" r="6" fill="#FFB5C0" opacity=".55" />
        <circle cx="122" cy="68" r="6" fill="#FFB5C0" opacity=".55" />
        {eyesOpen ? (
          <>
            <circle cx="88" cy="58" r="4.2" fill="#243746" />
            <circle cx="112" cy="58" r="4.2" fill="#243746" />
          </>
        ) : (
          <>
            <path d="M82 58 q6 5 12 0" stroke="#243746" strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <path d="M106 58 q6 5 12 0" stroke="#243746" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          </>
        )}
        <path d={pose === 'celebrate' ? 'M90 70 q10 11 20 0 Z' : 'M93 71 q7 5 14 0'} stroke="#243746" strokeWidth="3" fill={pose === 'celebrate' ? '#243746' : 'none'} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Logotipo: tortuga + nombre. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <Turtle size={size} animated={false} />
      <b style={{ fontSize: size * 0.6, fontWeight: 900, color: 'var(--sky-deep)' }}>Dokapp</b>
    </span>
  );
}
