import { useState } from 'react';
import { useInstall } from '../lib/pwa';
import { useApp } from '../state/app';
import { Icon } from './Icon';
import { Turtle } from './Turtle';
import { Sheet } from './ui';

/** Botón para instalar Dokapp en el móvil. No aparece si ya está instalada o el navegador no lo permite. */
export function InstallApp({ variant = 'card' }: { variant?: 'card' | 'button' | 'row' }) {
  const { toast, preview, backend } = useApp();
  const inst = useInstall();
  const [iosOpen, setIosOpen] = useState(false);
  if (preview || backend.kind === 'demo' || inst.installed || (!inst.canPrompt && !inst.needsIOSSteps)) return null;

  const go = async () => {
    if (inst.canPrompt) {
      if (await inst.install()) toast('¡Dokapp instalada! Ya la tienes en tu pantalla de inicio 🐢');
    } else setIosOpen(true);
  };

  const steps = (
    <Sheet open={iosOpen} onClose={() => setIosOpen(false)} title="Instalar Dokapp en tu iPhone">
      <ol className="col" style={{ paddingLeft: 20, margin: 0, gap: 12, fontSize: 15 }}>
        <li>Abre Dokapp en <b>Safari</b>.</li>
        <li>Pulsa el botón <b>Compartir</b> <Icon name="share" size={16} style={{ verticalAlign: 'text-bottom' }} /> en la barra inferior.</li>
        <li>Elige <b>«Añadir a pantalla de inicio»</b> y pulsa <b>Añadir</b>.</li>
      </ol>
      <p className="hint mt">Se abrirá a pantalla completa, como una app más, y seguirá conectada a tu cuenta.</p>
      <button className="btn block mt" onClick={() => setIosOpen(false)}>Entendido</button>
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
