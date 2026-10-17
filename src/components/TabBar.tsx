import { useApp } from '../state/app';
import { Icon, IconKey } from './Icon';

const TABS: { path: string; label: string; icon: IconKey }[] = [
  { path: '/', label: 'Cámara', icon: 'camera' },
  { path: '/seguimiento', label: 'Seguimiento', icon: 'chart' },
  { path: '/aprende', label: 'Aprende', icon: 'book' },
  { path: '/social', label: 'Social', icon: 'users' },
  { path: '/perfil', label: 'Perfil', icon: 'user' },
];

export function TabBar() {
  const { router } = useApp();
  const active = (p: string) => (p === '/' ? router.path === '/' : router.path.startsWith(p));
  return (
    <nav className="tabbar" aria-label="Navegación principal">
      {TABS.map((t) => (
        <button
          key={t.path}
          className={`tab ${t.path === '/' ? 'camera' : ''} ${active(t.path) ? 'on' : ''}`}
          onClick={() => router.navigate(t.path, { replace: true })}
          aria-current={active(t.path) ? 'page' : undefined}
        >
          {t.path === '/' ? <span className="tab-cam"><Icon name="camera" size={22} /></span> : <Icon name={t.icon} size={23} />}
          {t.label}
        </button>
      ))}
    </nav>
  );
}
