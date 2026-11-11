import { ReactNode, useState } from 'react';
import { useInstall } from '../lib/pwa';
import { useApp } from '../state/app';
import { Icon } from './Icon';
import { Turtle } from './Turtle';
import { Sheet } from './ui';

/** Botón para instalar Dokapp en el móvil. No aparece si ya está instalada o el navegador no lo permite. */
export function InstallApp({ variant = 'card' }: { variant?: 'card' | 'button' | 'row' }) {
  const { toast, preview, backend } = useApp();
  const inst = useInstall();
  const [stepsOpen, setStepsOpen] = useState(false);
  // El botón sale siempre que la app no esté instalada: si el navegador no deja instalar
  // con un toque, se muestran los pasos para este dispositivo.
  if (preview || backend.kind === 'demo' || inst.installed) return null;

  const go = async () => {
    if (inst.canPrompt) {
      if (await inst.install()) toast('¡Dokapp instalada! Ya la tienes en tu pantalla de inicio 🐢');
    } else setStepsOpen(true);
  };

  const STEPS: Record<typeof inst.platform, { title: string; items: ReactNode[]; note?: string }> = {
    ios: {
      title: 'Instalar Dokapp en tu iPhone',
      items: [
        <>Abre esta página en <b>Safari</b> (en iOS 16.4 o posterior también vale Chrome).</>,
        <>Pulsa <b>Compartir</b> <Icon name="share" size={16} style={{ verticalAlign: 'text-bottom' }} /> en la barra de abajo (o arriba en iPad).</>,
        <>Baja y elige <b>«Añadir a pantalla de inicio»</b>, y pulsa <b>Añadir</b>.</>,
      ],
    },
    android: {
      title: 'Instalar Dokapp en tu Android',
      items: [
        <>Abre esta página en <b>Chrome</b>.</>,
        <>Pulsa el menú <b>⋮</b> arriba a la derecha.</>,
        <>Elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>, y confirma.</>,
      ],
      note: 'En Samsung Internet: menú ☰ → «Añadir página a» → «Pantalla de inicio».',
    },
    desktop: {
      title: 'Instalar Dokapp en tu ordenador',
      items: [
        <>Abre esta página en <b>Chrome</b> o <b>Edge</b>.</>,
        <>Pulsa el icono de instalar <Icon name="download" size={16} style={{ verticalAlign: 'text-bottom' }} /> a la derecha de la barra de direcciones, o el menú <b>⋮</b> → <b>«Instalar Dokapp»</b>.</>,
      ],
      note: 'Safari en Mac: menú Archivo → «Añadir al Dock».',
    },
    inapp: {
      title: 'Ábrela en tu navegador',
      items: [
        <>Estás viendo Dokapp dentro de otra app (WhatsApp, Instagram…), que no permite instalar.</>,
        <>Pulsa el menú <b>⋮</b> o <b>…</b> y elige <b>«Abrir en el navegador»</b> (Chrome o Safari).</>,
        <>Allí, pulsa de nuevo <b>Instalar la app</b>.</>,
      ],
    },
  };
  const info = STEPS[inst.platform];

  const steps = (
    <Sheet open={stepsOpen} onClose={() => setStepsOpen(false)} title={info.title}>
      <ol className="col" style={{ paddingLeft: 20, margin: 0, gap: 12, fontSize: 15 }}>
        {info.items.map((it, i) => <li key={i}>{it}</li>)}
      </ol>
      {info.note && <p className="hint mt">{info.note}</p>}
      <p className="hint mt">Se abrirá a pantalla completa, como una app más, y seguirá conectada a tu cuenta.</p>
      <button className="btn block mt" onClick={() => setStepsOpen(false)}>Entendido</button>
    </Sheet>
  );

  if (variant === 'button') {
    return (
      <>
        <button className="btn ghost block" onClick={go}><Icon name="download" size={18} /> Instalar la app</button>
        {steps}
      </>
    );
  }
  if (variant === 'row') {
    return (
      <>
        <button className="list-item" onClick={go}>
          <Icon name="download" style={{ color: 'var(--sky-deep)' }} />
          <span className="grow"><b style={{ fontSize: 14 }}>Instalar Dokapp en este dispositivo</b><br /><span className="subtle">Ábrela desde tu pantalla de inicio, a pantalla completa.</span></span>
        </button>
        {steps}
      </>
    );
  }
  return (
    <>
      <div className="card row mt" style={{ background: 'linear-gradient(135deg, #EAF7FF, #fff)' }}>
        <Turtle size={54} animated={false} pose="wave" />
        <div className="grow">
          <b style={{ fontSize: 14 }}>Lleva Dokapp en tu móvil</b>
          <p className="subtle">Instálala y ábrela como una app más.</p>
        </div>
        <button className="btn small" onClick={go}>Instalar</button>
      </div>
      {steps}
    </>
  );
}

/** Aviso cuando no hay conexión: los datos viven en el servidor. */
export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div role="status" style={{ background: '#243746', color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 14px', textAlign: 'center', flex: 'none' }}>
      Sin conexión. Tus datos se guardan en el servidor: vuelve a conectarte para ver lo último.
    </div>
  );
}
