import { CSSProperties, ReactNode, useEffect, useState } from 'react';
import { emotion } from '../domain/emotions';
import { pillar } from '../domain/pillars';
import type { EmotionId, PillarId, Profile } from '../domain/types';
import { useApp } from '../state/app';
import { Icon, IconKey } from './Icon';
import { Turtle, TurtlePose } from './Turtle';

/** Muestra una foto por referencia ("scene:", "idb:", ruta de Storage o url). */
export function Photo({ src, alt = '', className = 'photo', style }: { src: string; alt?: string; className?: string; style?: CSSProperties }) {
  const { backend } = useApp();
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    let alive = true;
    backend.resolvePhoto(src).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [src, backend]);
  return url ? <img src={url} alt={alt} className={className} style={style} loading="lazy" draggable={false} /> : <div className={className} style={style} />;
}

export function Avatar({ profile, size = 44 }: { profile?: Pick<Profile, 'avatar' | 'name' | 'username'>; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (profile?.avatar) return <Photo src={profile.avatar} className="avatar" style={style} alt={profile.name} />;
  const initials = (profile?.name || profile?.username || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <div className="avatar" style={style}>{initials}</div>;
}

export function PillarBadge({ id, size = 'md', solid = false }: { id: PillarId; size?: 'sm' | 'md' | 'lg'; solid?: boolean }) {
  const p = pillar(id);
  const px = { sm: 15, md: 20, lg: 26 }[size];
  return (
    <span className={`pillar-badge ${size === 'md' ? '' : size}`} style={{ background: solid ? p.color : p.soft, color: solid ? '#fff' : p.color }}>
      <PillarGlyph id={id} size={px} />
    </span>
  );
}

export function PillarGlyph({ id, size = 20 }: { id: PillarId; size?: number }) {
  return <Icon name={pillar(id).icon as IconKey} size={size} />;
}

/** Caras de emoción ilustradas, coherentes con el estilo de la app. */
export function EmotionFace({ id, size = 56 }: { id: EmotionId; size?: number }) {
  const e = emotion(id);
  const mouth: Record<EmotionId, ReactNode> = {
    triste: <path d="M38 70 q12 -10 24 0" />,
    enfadado: <path d="M38 68 q12 -6 24 0" />,
    feliz: <path d="M34 60 q16 18 32 0" />,
    motivado: <path d="M34 58 q16 22 32 0 z" fill="#243746" />,
    cansado: <path d="M40 66 h20" />,
  };
  const eyes: Record<EmotionId, ReactNode> = {
    triste: <><circle cx="38" cy="46" r="4" fill="#243746" stroke="none" /><circle cx="62" cy="46" r="4" fill="#243746" stroke="none" /><path d="M30 38 l12 -4 M70 38 l-12 -4" /></>,
    enfadado: <><circle cx="38" cy="48" r="4" fill="#243746" stroke="none" /><circle cx="62" cy="48" r="4" fill="#243746" stroke="none" /><path d="M30 36 l14 6 M70 36 l-14 6" /></>,
    feliz: <><path d="M32 46 q6 -7 12 0" /><path d="M56 46 q6 -7 12 0" /></>,
    motivado: <><path d="M32 44 q6 -7 12 0" /><path d="M56 44 q6 -7 12 0" /></>,
    cansado: <><path d="M32 47 q6 5 12 0" /><path d="M56 47 q6 5 12 0" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label={e.label} role="img">
      <circle cx="50" cy="50" r="46" fill={e.soft} />
      <circle cx="50" cy="50" r="38" fill={e.color} opacity=".9" />
      {id === 'motivado' && <path d="M50 4 q8 10 0 18 q-8 -8 0 -18z" fill="#FF8A3D" />}
      <g stroke="#243746" strokeWidth="4.5" strokeLinecap="round" fill="none">
        {eyes[id]}
        {mouth[id]}
      </g>
      {id === 'cansado' && <text x="70" y="30" fontSize="16" fontWeight="900" fill="#243746">z</text>}
    </svg>
  );
}

export function Bar({ value, color = 'var(--sky)', height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <div className="bar" style={{ height }}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

export function Ring({ value, size = 150, stroke = 14, color = 'var(--sky)', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E6F1F8" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, value)) / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="val">{children}</div>
    </div>
  );
}

export function TopBar({ title, back, right, center = false }: { title?: ReactNode; back?: string | true; right?: ReactNode; center?: boolean }) {
  const { router } = useApp();
  return (
    <div className="topbar">
      {back && (
        <button className="icon-btn" aria-label="Volver" onClick={() => router.back(typeof back === 'string' ? back : '/')}>
          <Icon name="chevronLeft" />
        </button>
      )}
      <h1 className={center ? 'title-center' : ''} style={center ? { justifyContent: 'center' } : undefined}>{title}</h1>
      {right ?? (back && center ? <span style={{ width: 40 }} /> : null)}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch" aria-label={label}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </label>
  );
}

export function Empty({ pose = 'meditate', title, text, children }: { pose?: TurtlePose; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="col center" style={{ alignItems: 'center', padding: '26px 10px' }}>
      <Turtle pose={pose} size={110} />
      <b style={{ fontSize: 17 }}>{title}</b>
      {text && <p className="muted" style={{ fontSize: 14, maxWidth: 280 }}>{text}</p>}
      {children}
    </div>
  );
}

export function Loading() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <div className="spinner" />
    </div>
  );
}

export function StatusBar() {
  const d = new Date();
  return (
    <div className="statusbar" aria-hidden="true">
      <span>{`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`}</span>
      <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="18" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="1" fill="#243746" /><rect x="5" y="5" width="3" height="6" rx="1" fill="#243746" /><rect x="10" y="2.5" width="3" height="8.5" rx="1" fill="#243746" /><rect x="15" y="0" width="3" height="11" rx="1" fill="#243746" /></svg>
        <svg width="24" height="11" viewBox="0 0 24 11"><rect x=".5" y=".5" width="20" height="10" rx="3" stroke="#243746" fill="none" /><rect x="2" y="2" width="15" height="7" rx="1.5" fill="#243746" /><rect x="21.5" y="3.5" width="2" height="4" rx="1" fill="#243746" /></svg>
      </span>
    </div>
  );
}
