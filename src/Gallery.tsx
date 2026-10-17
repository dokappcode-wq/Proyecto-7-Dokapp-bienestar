import { useEffect, useMemo, useRef, useState } from 'react';
import { DokappApp } from './App';
import { Icon } from './components/Icon';
import { Turtle } from './components/Turtle';
import { LocalBackend } from './data/localBackend';
import { MemoryKV } from './lib/kv';
import { MemoryPhotoStore } from './lib/photoStore';
import { useMemoryRouter } from './state/app';

/** Las doce pantallas pedidas, más algunas extra del flujo. */
export const SCREENS: { n: number | null; title: string; route: string }[] = [
  { n: 1, title: 'Splash con la tortuga meditando', route: '/splash' },
  { n: 2, title: 'Onboarding y registro', route: '/onboarding?paso=1' },
  { n: 3, title: 'Cámara principal', route: '/' },
  { n: 4, title: 'Tras la foto: emoción', route: '/?paso=emocion&foto=scene:atardecer' },
  { n: 5, title: 'Dashboard de seguimiento', route: '/seguimiento' },
  { n: 6, title: 'Detalle de un pilar', route: '/seguimiento/pilar/fisica' },
  { n: 7, title: 'Aprende: siete caminos', route: '/aprende' },
  { n: 8, title: 'Lección interactiva', route: '/leccion/mental-4?fase=3' },
  { n: 9, title: 'Feed social', route: '/social' },
  { n: 10, title: 'Grupo y racha colectiva', route: '/social/grupo/g-buenos-habitos' },
  { n: 11, title: 'Perfil personal', route: '/perfil' },
  { n: 12, title: 'Calendario mensual', route: '/perfil/calendario' },
  { n: null, title: 'Bienvenida', route: '/bienvenida' },
  { n: null, title: 'Tras la foto: categoría', route: '/?paso=categoria&foto=scene:ensalada' },
  { n: null, title: 'Tras la foto: publicación', route: '/?paso=publicar&foto=scene:atardecer' },
  { n: null, title: 'Camino de aprendizaje', route: '/aprende/mental' },
  { n: null, title: 'Seguir personas', route: '/social?tab=personas' },
  { n: null, title: 'Respiración guiada', route: '/herramienta/breathing' },
];

let seeded: string | null = null;
/** Cada teléfono tiene su propia copia de los datos de demostración (sin persistencia). */
function demoBackend(): LocalBackend {
  if (!seeded) {
    const kv = new MemoryKV();
    new LocalBackend(kv, new MemoryPhotoStore(), { demo: true });
    seeded = kv.get('dokapp:db:v1');
  }
  const kv = new MemoryKV();
  kv.set('dokapp:db:v1', seeded!);
  return new LocalBackend(kv, new MemoryPhotoStore(), { demo: true });
}

function Instance({ route, preview }: { route: string; preview: boolean }) {
  const backend = useMemo(demoBackend, []);
  const router = useMemoryRouter(route);
  return <DokappApp backend={backend} router={router} preview={preview} framed={false} splash={false} />;
}

function Phone({ route, onOpen }: { route: string; onOpen: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 390));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="phone" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen()} aria-label="Abrir pantalla interactiva">
      <div className="phone-inner" style={{ transform: `scale(${scale})` }} aria-hidden="true">
        <Instance route={route} preview />
      </div>
    </div>
  );
}

export function Gallery({ onStart }: { onStart: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const main = SCREENS.filter((s) => s.n !== null);
  const extra = SCREENS.filter((s) => s.n === null);
  return (
    <div className="gallery">
      <header className="gallery-head">
        <div className="row" style={{ gap: 14 }}>
          <Turtle size={72} />
          <div>
            <h1>Dokapp: Bienestar</h1>
            <p className="muted">Pequeñas acciones. Grandes cambios. · Vista previa navegable: pulsa cualquier pantalla para usarla.</p>
          </div>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={() => setOpen('/')}><Icon name="play" size={16} /> Probar la demo</button>
          <button className="btn" onClick={onStart}>Crear mi cuenta</button>
        </div>
      </header>
      <div className="gallery-grid">
        {main.map((s) => (
          <div key={s.route}>
            <Phone route={s.route} onOpen={() => setOpen(s.route)} />
            <p className="phone-caption"><span>{s.n}.</span> {s.title}</p>
          </div>
        ))}
      </div>
      <h2 style={{ maxWidth: 1240, margin: '44px auto 20px', fontSize: 20, fontWeight: 900, color: 'var(--sky-deep)' }}>Más pantallas del flujo</h2>
      <div className="gallery-grid">
        {extra.map((s) => (
          <div key={s.route}>
            <Phone route={s.route} onOpen={() => setOpen(s.route)} />
            <p className="phone-caption">{s.title}</p>
          </div>
        ))}
      </div>
      <p className="subtle center" style={{ marginTop: 40 }}>Datos de demostración. Nada de lo que hagas en la vista previa se guarda.</p>
      {open && (
        <div className="zoom-overlay" onClick={() => setOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
            <button className="icon-btn solid" style={{ position: 'absolute', top: -12, right: -12, zIndex: 300 }} onClick={() => setOpen(null)} aria-label="Cerrar"><Icon name="close" /></button>
            <Instance route={open} preview />
          </div>
        </div>
      )}
    </div>
  );
}
