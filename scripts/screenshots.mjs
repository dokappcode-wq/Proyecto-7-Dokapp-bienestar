// Genera las capturas de alta fidelidad de las pantallas principales.
// Uso: npm run dev (en otra terminal) y después `npm run screenshots [url-base]`.
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173/';
const OUT = 'docs/screenshots';
const SCREENS = [
  ['01-splash', '/splash'],
  ['02-onboarding', '/onboarding?paso=1'],
  ['03-camara', '/'],
  ['04-emocion', '/?paso=emocion&foto=scene:atardecer'],
  ['05-seguimiento', '/seguimiento'],
  ['06-pilar', '/seguimiento/pilar/fisica'],
  ['07-aprende', '/aprende'],
  ['08-leccion', '/leccion/mental-4?fase=3'],
  ['09-social', '/social'],
  ['10-grupo', '/social/grupo/g-buenos-habitos'],
  ['11-perfil', '/perfil'],
  ['12-calendario', '/perfil/calendario'],
  ['13-categoria', '/?paso=categoria&foto=scene:ensalada'],
  ['14-publicar', '/?paso=publicar&foto=scene:atardecer'],
  ['15-camino', '/aprende/mental'],
  ['16-personas', '/social?tab=personas'],
];

const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-ES' });
const errors = [];
for (const [name, route] of SCREENS) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  await page.goto(`${BASE}?demo#${route}`);
  await page.waitForTimeout(route === '/splash' ? 900 : 2600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.close();
}
const g = await ctx.newPage();
await g.setViewportSize({ width: 1280, height: 900 });
await g.goto(`${BASE}#/galeria`);
await g.waitForTimeout(2500);
await g.screenshot({ path: `${OUT}/00-galeria.png`, fullPage: true });
await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Capturas en ${OUT}/`);
