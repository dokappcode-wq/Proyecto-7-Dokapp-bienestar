import { ReactElement, useEffect, useState } from 'react';
import { TabBar } from './components/TabBar';
import { Turtle } from './components/Turtle';
import { Loading, StatusBar } from './components/ui';
import type { Backend } from './data/backend';
import { PILLAR_IDS } from './domain/pillars';
import type { PillarId } from './domain/types';
import { AuthForm, Welcome } from './screens/Auth';
import { CameraScreen } from './screens/Camera';
import { LearnScreen, LessonScreen, PathScreen, ToolScreen } from './screens/Learn';
import { Onboarding } from './screens/Onboarding';
import { CalendarScreen, EditProfileScreen, GoalsScreen, ProfileScreen, SettingsScreen } from './screens/Profile';
import { GroupScreen, SocialScreen, UserScreen } from './screens/Social';
import { PillarDetail, TrackingScreen } from './screens/Tracking';
import { AppProvider, Router, useApp } from './state/app';

export function Splash({ leaving = false }: { leaving?: boolean }) {
  return (
    <div className={`splash ${leaving ? 'out' : ''}`} role="status" aria-label="Cargando Dokapp">
      <Turtle size={170} />
      <div className="brand">Dokapp<span>:</span> Bienestar</div>
      <p className="tag">Tu bienestar, una acción cada día.</p>
      <svg className="waves" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 60 C80 20 160 100 240 60 C300 30 360 50 400 40 V140 H0Z" fill="#CFEAF8" />
        <path d="M0 90 C90 60 170 120 260 90 C320 70 370 90 400 80 V140 H0Z" fill="#A8DDF8" opacity=".7" />
      </svg>
    </div>
  );
}

const isPillar = (x: string): x is PillarId => (PILLAR_IDS as string[]).includes(x);

function Routes() {
  const { status, snap, router } = useApp();
  const { path, query } = router;
  const seg = path.split('/').filter(Boolean);

  if (path === '/splash') return <Splash />;
  if (status === 'boot') return <Loading />;
  if (status === 'error') {
    return (
      <div className="auth" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <Turtle pose="rest" size={140} />
        <h1>No hemos podido cargar tus datos</h1>
        <p className="muted">Comprueba tu conexión e inténtalo de nuevo.</p>
        <button className="btn" onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );
  }
  if (status === 'anon') {
    if (path === '/entrar') return <AuthForm mode="login" />;
    if (path === '/registro') return <AuthForm mode="register" />;
    return <Welcome initialSlide={Number(query.get('slide') ?? 0)} />;
  }
  if (!snap!.me.onboarded || path === '/onboarding') return <Onboarding initialStep={Number(query.get('paso') ?? 0)} />;

  let screen: ReactElement;
  let tabs = true;
  switch (seg[0]) {
    case undefined:
      screen = <CameraScreen key={query.toString()} />;
      if (query.get('paso')) tabs = false;
      break;
    case 'seguimiento':
      if (seg[1] === 'pilar' && seg[2] && isPillar(seg[2])) {
        screen = <PillarDetail id={seg[2]} />;
        tabs = false;
      } else screen = <TrackingScreen />;
      break;
    case 'aprende':
      if (seg[1] && isPillar(seg[1])) {
        screen = <PathScreen id={seg[1]} />;
        tabs = false;
      } else screen = <LearnScreen />;
      break;
    case 'leccion':
      screen = <LessonScreen key={seg[1]} id={seg[1]} demoPhase={query.has('fase') ? Number(query.get('fase')) : undefined} />;
      tabs = false;
      break;
    case 'herramienta':
      screen = <ToolScreen id={seg[1]} />;
      tabs = false;
      break;
    case 'social':
      if (seg[1] === 'grupo' && seg[2]) {
        screen = <GroupScreen id={seg[2]} />;
        tabs = false;
      } else screen = <SocialScreen key={query.get('tab') ?? ''} />;
      break;
    case 'usuario':
      screen = <UserScreen id={seg[1]} />;
      tabs = false;
      break;
    case 'perfil':
      tabs = !seg[1];
      screen = seg[1] === 'calendario' ? <CalendarScreen /> : seg[1] === 'editar' ? <EditProfileScreen /> : seg[1] === 'objetivos' ? <GoalsScreen /> : <ProfileScreen />;
      break;
    case 'ajustes':
      screen = <SettingsScreen />;
      tabs = false;
      break;
    default:
      screen = <CameraScreen />;
  }
  return (
    <>
      {screen}
      {tabs && <TabBar />}
    </>
  );
}

function Shell({ splash, statusBar }: { splash: boolean; statusBar: boolean }) {
  const { status } = useApp();
  const [phase, setPhase] = useState<'show' | 'leaving' | 'gone'>(splash ? 'show' : 'gone');
  useEffect(() => {
    if (phase !== 'show' || status === 'boot') return;
    const t1 = setTimeout(() => setPhase('leaving'), 1400);
    const t2 = setTimeout(() => setPhase('gone'), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [status, phase]);
  return (
    <>
      {statusBar && <StatusBar />}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes />
      </div>
      {phase !== 'gone' && <Splash leaving={phase === 'leaving'} />}
    </>
  );
}

export function DokappApp({ backend, router, preview = false, framed = true, splash = true }: {
  backend: Backend; router: Router; preview?: boolean; framed?: boolean; splash?: boolean;
}) {
  return (
    <div className={`app ${framed ? 'framed' : ''}`}>
      <AppProvider backend={backend} router={router} preview={preview}>
        <Shell splash={splash} statusBar={preview} />
      </AppProvider>
    </div>
  );
}
