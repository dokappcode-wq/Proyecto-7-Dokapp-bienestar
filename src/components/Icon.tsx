// Iconografía de líneas simples (24×24, trazo 2).
import type { CSSProperties } from 'react';

const PATHS = {
  camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  chart: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  book: 'M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2z M20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M17 3.5a4 4 0 0 1 0 7.5 M22 21a7 7 0 0 0-4-6.3',
  user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M3 22a9 9 0 0 1 18 0',
  leaf: 'M5 19C5 10 10 5 20 4c0 10-5 15-14 15z M5 19l7-7',
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1z M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1',
  heart: 'M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z',
  run: 'M14 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M7 22l3-6 3 2v4 M13 8l-3 3 3 3 3-1 3 2 M10 11L7 9l-3 2 M13 8l3 2',
  apple: 'M12 7c-2-2-6-1.5-7 2-1 4 1 10 4 11 1 .3 2-.5 3-.5s2 .8 3 .5c3-1 5-7 4-11-1-3.5-5-4-7-2z M12 7c0-2 1-4 3-4',
  phoneOff: 'M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M11 18h2 M3 3l18 18',
  lotus: 'M12 20c-4 0-8-2-9-6 3 0 6 1 9 4 3-3 6-4 9-4-1 4-5 6-9 6z M12 18c-2-2-3-5-3-8 1 1 2.5 1.5 3 3 .5-1.5 2-2 3-3 0 3-1 6-3 8z M12 6c-1 1.5-1.5 3-1 5 M12 6c1 1.5 1.5 3 1 5',
  flame: 'M12 22c4 0 7-2.5 7-7 0-3.5-2-6-4-8 0 2.5-1 4-3 4 1-3 0-6-3-9-.5 3-2 5-3.5 7S4 12.5 4 15c0 4.5 3.5 7 8 7z',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  plus: 'M12 5v14 M5 12h14',
  image: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M3 16l5-5 4 4 3-3 6 6 M15.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  close: 'M6 6l12 12 M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-5-5',
  lock: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c3 3.5 3 14.5 0 18 M12 3c-3 3.5-3 14.5 0 18',
  calendar: 'M4 6h16v15H4z M4 10h16 M8 3v4 M16 3v4',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0z M8 6H4c0 3 1.5 5 4 5 M16 6h4c0 3-1.5 5-4 5 M12 13v4 M8 21h8 M9 17h6v4',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M15.5 8.5l-2 5-5 2 2-5z',
  spark: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5L18 18 M6 18l2.5-2.5 M15.5 8.5L18 6',
  message: 'M4 5h16v11H9l-5 4z',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16z M13 7l4 4',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4h3v16H7z M14 4h3v16h-3z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  flip: 'M4 9a8 8 0 0 1 14-3l2 2 M20 4v4h-4 M20 15a8 8 0 0 1-14 3l-2-2 M4 20v-4h4',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 12h.01',
  logout: 'M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v6 M12 7.5v.5',
  share: 'M12 3v12 M7 8l5-5 5 5 M5 14v6h14v-6',
  download: 'M12 4v12 M7 11l5 5 5-5 M5 20h14',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z',
  wind: 'M3 8h11a3 3 0 1 0-3-3 M3 12h16a3 3 0 1 1-3 3 M3 16h8',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  dots: 'M5 12h.01 M12 12h.01 M19 12h.01',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 21h4',
  key: 'M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M11 11h10 M17 11v3 M20 11v2',
  copy: 'M8 8h12v12H8z M4 16V4h12',
  pen: 'M4 20l4-1L19 8l-3-3L5 16z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
} as const;

export type IconKey = keyof typeof PATHS;

export function Icon({ name, size = 22, stroke = 2, className, style }: { name: IconKey; size?: number; stroke?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
