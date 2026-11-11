// Compila la web para Netlify conectada al servidor de Render.
// Uso: node scripts/build-netlify.mjs https://tu-servicio.onrender.com
// Netlify reenvía /api/* al servidor (proxy de _redirects), así la sesión y las fotos
// funcionan como si todo estuviera en la misma web.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

// La dirección puede venir como argumento o en la variable RENDER_URL (configurada en Netlify).
const api = (process.argv[2] ?? process.env.RENDER_URL ?? '').trim().replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/i.test(api)) {
  console.error('Falta la dirección del servidor de Render: define RENDER_URL (p. ej. https://dokapp.onrender.com) en Netlify → Site configuration → Environment variables.');
  process.exit(1);
}
execSync('npx tsc --noEmit && npx vite build', { stdio: 'inherit', env: { ...process.env, VITE_BACKEND: 'api' } });
writeFileSync('dist/_redirects', `/api/*  ${api}/api/:splat  200!\n`);
writeFileSync('dist/_headers', [
  '/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: same-origin', '  Permissions-Policy: camera=(self), geolocation=()',
  '/sw.js', '  Cache-Control: no-cache', '',
].join('\n'));
console.log(`Listo: dist/ conectado a ${api}. Arrastra la carpeta dist a Netlify.`);
