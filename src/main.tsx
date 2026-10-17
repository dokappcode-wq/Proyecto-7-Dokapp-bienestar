import '@fontsource-variable/nunito';
import './styles.css';
import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { DokappApp } from './App';
import { ApiBackend } from './data/apiBackend';
import type { Backend } from './data/backend';
import { LocalBackend } from './data/localBackend';
import { SupabaseBackend } from './data/supabaseBackend';
import { Gallery } from './Gallery';
import { browserKV, MemoryKV } from './lib/kv';
import { createPhotoStore, MemoryPhotoStore } from './lib/photoStore';
import { useHashRouter } from './state/app';

function createBackend(): Backend {
  if (new URLSearchParams(window.location.search).has('demo')) {
    return new LocalBackend(new MemoryKV(), new MemoryPhotoStore(), { demo: true });
  }
  // config.js (editable tras compilar) tiene prioridad sobre las variables de compilación.
  const cfg = (window as { DOKAPP_CONFIG?: { supabaseUrl?: string; supabaseAnonKey?: string } }).DOKAPP_CONFIG;
  const url = cfg?.supabaseUrl?.trim() || (import.meta.env.VITE_SUPABASE_URL as string | undefined);
  const key = cfg?.supabaseAnonKey?.trim() || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  if (url && key) return new SupabaseBackend(url, key);
  if (import.meta.env.VITE_BACKEND === 'api') return new ApiBackend();
  return new LocalBackend(browserKV(), createPhotoStore());
}

function Root() {
  const router = useHashRouter();
  const backend = useMemo(createBackend, []);
  if (router.path === '/galeria') return <Gallery onStart={() => router.navigate('/', { replace: true })} />;
  return <DokappApp backend={backend} router={router} />;
}

// La versión de un solo archivo (vista previa) abre por defecto en la galería de pantallas.
if (import.meta.env.MODE === 'single' && !window.location.hash) window.location.replace('#/galeria');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
