// App instalable (PWA): registro del service worker, botón de instalar y estado de la conexión.

import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// El navegador puede ofrecer la instalación antes de que React monte la pantalla: se guarda aquí.
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const secure = location.protocol === 'https:' || location.hostname === 'localhost';
  // Ni en la demo ni en la vista previa de un solo archivo: solo en la app real.
  if (!secure || import.meta.env.MODE === 'single' || new URLSearchParams(location.search).has('demo')) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'inapp';

/** Navegadores dentro de otras apps (WhatsApp, Instagram, Facebook…): no permiten instalar. */
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Snapchat|TikTok|musical_ly|; wv\)|GSA\//i;

export function installPlatform(): InstallPlatform {
  const ua = navigator.userAgent;
  if (IN_APP.test(ua)) return 'inapp';
  if (isIOS()) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  const installed = isStandalone();
  return {
    installed,
    /** El navegador permite instalar con un toque (Chrome/Edge en Android y ordenador). */
    canPrompt: !installed && deferred !== null,
    /** Si no, se muestran los pasos para este dispositivo. */
    platform: installPlatform(),
    async install() {
      if (!deferred) return false;
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      notify();
      return outcome === 'accepted';
    },
  };
}

export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
