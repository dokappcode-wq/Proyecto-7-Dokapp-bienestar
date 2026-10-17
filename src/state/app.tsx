import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Backend } from '../data/backend';
import type { Profile, Snapshot, WellnessAction } from '../domain/types';

// ---- Router (hash en la app, memoria en la galería) ------------------------

export interface Router {
  path: string;
  query: URLSearchParams;
  navigate(to: string, opts?: { replace?: boolean }): void;
  back(fallback?: string): void;
}

const split = (full: string) => {
  const [p, q = ''] = full.split('?');
  return { path: p || '/', query: new URLSearchParams(q) };
};

export function useHashRouter(): Router {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [full, setFull] = useState(read);
  useEffect(() => {
    const on = () => setFull(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const depth = useRef(0);
  return useMemo(() => ({
    ...split(full),
    navigate(to, opts) {
      if (opts?.replace) window.location.replace(`#${to}`);
      else {
        depth.current++;
        window.location.hash = to;
      }
    },
    back(fallback = '/') {
      if (depth.current > 0) {
        depth.current--;
        window.history.back();
      } else window.location.replace(`#${fallback}`);
    },
  }), [full]);
}

export function useMemoryRouter(initial: string): Router {
  const [stack, setStack] = useState([initial]);
  const full = stack[stack.length - 1];
  return useMemo(() => ({
    ...split(full),
    navigate(to, opts) {
      setStack((s) => (opts?.replace ? [...s.slice(0, -1), to] : [...s, to]));
    },
    back(fallback = '/') {
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : [fallback]));
    },
  }), [full]);
}

// ---- Estado de la aplicación ----------------------------------------------

export type Status = 'boot' | 'anon' | 'ready' | 'error';

interface Toast { id: number; text: string; kind: 'info' | 'error' }

export interface AppState {
  backend: Backend;
  router: Router;
  status: Status;
  snap: Snapshot | null;
  /** Vista previa estática (galería): sin cámara real ni animaciones largas. */
  preview: boolean;
  refresh(): Promise<void>;
  /** Ejecuta una mutación, recarga los datos y muestra los errores de forma amable. */
  run<T>(fn: (b: Backend) => Promise<T>, success?: string): Promise<T | undefined>;
  toast(text: string, kind?: 'info' | 'error'): void;
  now(): Date;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ backend, router, preview = false, children }: { backend: Backend; router: Router; preview?: boolean; children: ReactNode }) {
  const [status, setStatus] = useState<Status>('boot');
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, kind: 'info' | 'error' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await backend.currentUserId();
      if (!me) {
        setSnap(null);
        setStatus('anon');
        return;
      }
      setSnap(await backend.load());
      setStatus('ready');
    } catch (e) {
      toast((e as Error).message, 'error');
      setStatus('error');
    }
  }, [backend, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = useCallback(async <T,>(fn: (b: Backend) => Promise<T>, success?: string) => {
    try {
      const r = await fn(backend);
      await refresh();
      if (success) toast(success);
      return r;
    } catch (e) {
      toast((e as Error).message || 'Algo no ha ido bien. Inténtalo de nuevo.', 'error');
      return undefined;
    }
  }, [backend, refresh, toast]);

  const value = useMemo<AppState>(() => ({
    backend, router, status, snap, preview, refresh, run, toast, now: () => new Date(),
  }), [backend, router, status, snap, preview, refresh, run, toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'error' ? 'error' : ''}`} role="status">{t.text}</div>
      ))}
    </Ctx.Provider>
  );
}

export function useApp(): AppState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp fuera de AppProvider');
  return c;
}

/** Atajos sobre el snapshot cuando hay sesión. */
export function useData() {
  const app = useApp();
  const s = app.snap!;
  return useMemo(() => {
    const profiles = new Map<string, Profile>(s.profiles.map((p) => [p.id, p]));
    const myActions = s.actions.filter((a) => a.userId === s.me.id);
    const following = new Set(s.follows.filter((f) => f.followerId === s.me.id && f.status === 'accepted').map((f) => f.followingId));
    const pending = new Set(s.follows.filter((f) => f.followerId === s.me.id && f.status === 'pending').map((f) => f.followingId));
    const followers = s.follows.filter((f) => f.followingId === s.me.id && f.status === 'accepted').map((f) => f.followerId);
    const requests = s.follows.filter((f) => f.followingId === s.me.id && f.status === 'pending');
    const myGroups = s.groups.filter((g) => s.members.some((m) => m.groupId === g.id && m.userId === s.me.id));
    const byUser = (id: string): WellnessAction[] => s.actions.filter((a) => a.userId === id);
    return { s, me: s.me, profiles, myActions, following, pending, followers, requests, myGroups, byUser };
  }, [s]);
}
