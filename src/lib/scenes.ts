// Ilustraciones de ejemplo (flat design) para los datos de demostración.
// Se generan como SVG para que la app funcione sin conexión y con una estética coherente.

export type SceneId =
  | 'sendero' | 'bosque' | 'planta' | 'bici'
  | 'ensalada' | 'agua' | 'fruta' | 'cocinar'
  | 'correr' | 'yoga'
  | 'libro' | 'cama'
  | 'meditar' | 'atardecer'
  | 'movil'
  | 'cafe' | 'carta';

const W = 600;
const H = 750;

const svg = (body: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;

const lin = (id: string, stops: [string, string][], vertical = true) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join('')}</linearGradient>`;

const sunsetSky = lin('sky', [['0', '#3B5B8C'], ['0.45', '#E99A7A'], ['0.75', '#F7C77E'], ['1', '#FCE3B0']]);
const daySky = lin('sky', [['0', '#73C9F5'], ['1', '#EAF7FF']]);
const roomWall = lin('wall', [['0', '#F6EFE6'], ['1', '#EADFD0']]);

const SCENES: Record<SceneId, () => string> = {
  sendero: () => svg(
    `<rect width="600" height="750" fill="url(#sky)"/>
     <circle cx="420" cy="330" r="56" fill="#FFE7A8" opacity=".95"/>
     <path d="M0 400 L120 300 L210 360 L330 250 L460 350 L600 290 V750 H0Z" fill="#6E7FA8" opacity=".7"/>
     <path d="M0 470 L140 380 L260 450 L380 370 L520 440 L600 410 V750 H0Z" fill="#4E6A8E" opacity=".85"/>
     <path d="M0 560 Q200 480 600 540 V750 H0Z" fill="#3D5470"/>
     <path d="M250 750 Q290 620 330 560 Q350 540 380 540" stroke="#C8A97E" stroke-width="40" fill="none" stroke-linecap="round"/>
     <g fill="#1F2D3D"><path d="M210 750 l30 -110 l26 0 l-20 110z"/><path d="M300 750 l-8 -110 l26 0 l12 110z"/><ellipse cx="248" cy="636" rx="22" ry="12"/><ellipse cx="310" cy="636" rx="22" ry="12"/></g>`,
    sunsetSky),
  bosque: () => svg(
    `<rect width="600" height="750" fill="url(#sky)"/>
     ${[60, 170, 290, 410, 530].map((x, i) => `<g transform="translate(${x} ${300 + (i % 2) * 40})"><rect x="-10" y="180" width="20" height="300" fill="#6B4E3A"/><path d="M0 0 L80 140 H-80Z M0 60 L95 220 H-95Z M0 130 L110 300 H-110Z" fill="${['#2F8F5B', '#3FB37F', '#2A7A4F'][i % 3]}"/></g>`).join('')}
     <path d="M0 640 Q300 600 600 650 V750 H0Z" fill="#7FCB8F"/>
     <path d="M260 750 Q300 690 340 640" stroke="#E8D9B5" stroke-width="30" fill="none"/>`,
    lin('sky', [['0', '#BDE6D0'], ['1', '#EAF7EF']])),
  planta: () => svg(
    `<rect width="600" height="750" fill="url(#wall)"/>
     <rect x="0" y="560" width="600" height="190" fill="#D9C3A5"/>
     <rect x="380" y="90" width="170" height="240" rx="10" fill="#CFEAF8" stroke="#fff" stroke-width="12"/>
     <path d="M300 520 C230 420 170 400 140 330 C220 340 280 400 300 480Z" fill="#3FB37F"/>
     <path d="M300 520 C360 400 430 380 470 300 C380 320 320 390 300 470Z" fill="#2F9E6B"/>
     <path d="M300 520 C290 400 300 300 330 230 C350 330 330 420 300 500Z" fill="#56C28C"/>
     <path d="M215 500 H385 L360 650 H240Z" fill="#E28B5B"/><rect x="205" y="490" width="190" height="34" rx="10" fill="#EFA071"/>
     <g fill="#73C9F5"><path d="M420 420 q-20 30 0 40 q20 -10 0 -40z"/></g>`,
    roomWall),
  bici: () => svg(
    `<rect width="600" height="750" fill="url(#sky)"/>
     <circle cx="120" cy="150" r="46" fill="#FFF4C2"/>
     <path d="M0 520 Q300 470 600 520 V750 H0Z" fill="#8ED1A0"/>
     <rect x="0" y="560" width="600" height="80" fill="#B9C6D2"/>
     <g stroke="#243746" stroke-width="10" fill="none" stroke-linecap="round"><circle cx="190" cy="520" r="70"/><circle cx="410" cy="520" r="70"/><path d="M190 520 L270 410 H380 L410 520 M270 410 L310 520 L380 410 M250 380 h50 M380 410 l-10 -40 h40"/></g>
     <circle cx="310" cy="520" r="14" fill="#73C9F5"/>
     ${[60, 520].map((x) => `<g transform="translate(${x} 330)"><rect x="-8" y="60" width="16" height="140" fill="#6B4E3A"/><circle r="70" fill="#3FB37F"/></g>`).join('')}`,
    daySky),
  ensalada: () => svg(
    `<rect width="600" height="750" fill="#E9DCC8"/>
     <rect width="600" height="750" fill="url(#wood)" opacity=".5"/>
     <ellipse cx="300" cy="400" rx="250" ry="230" fill="#fff"/>
     <ellipse cx="300" cy="400" rx="210" ry="190" fill="#F4F7FA"/>
     <path d="M140 390 q60 -110 160 -120 q100 10 160 120 q-50 120 -160 130 q-110 -10 -160 -130z" fill="#6CC27A"/>
     ${[[220, 360], [300, 330], [380, 370], [250, 440], [350, 450]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${30 + (i % 2) * 6}" fill="${['#EF6B5B', '#F5A524', '#E8657A', '#F7D35B', '#EF6B5B'][i]}"/>`).join('')}
     ${[[270, 390], [330, 400], [300, 470], [200, 410], [400, 420]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="26" ry="16" fill="#3FA86A"/>`).join('')}
     <ellipse cx="320" cy="380" rx="34" ry="24" fill="#FFF3D6"/><circle cx="320" cy="380" r="13" fill="#F5B82E"/>
     <rect x="500" y="520" width="18" height="200" rx="9" fill="#C9CED6" transform="rotate(-20 500 520)"/>`,
    lin('wood', [['0', '#D8C3A3'], ['1', '#C9AE88']])),
  agua: () => svg(
    `<rect width="600" height="750" fill="url(#sky)"/>
     <rect x="0" y="520" width="600" height="230" fill="#EAF7FF"/>
     <path d="M200 200 H400 L375 640 H225Z" fill="#fff" opacity=".85" stroke="#BFE3F7" stroke-width="6"/>
     <path d="M212 330 H388 L375 640 H225Z" fill="#73C9F5" opacity=".6"/>
     <ellipse cx="300" cy="330" rx="88" ry="10" fill="#A8DDF8"/>
     <circle cx="270" cy="420" r="8" fill="#fff" opacity=".8"/><circle cx="320" cy="480" r="6" fill="#fff" opacity=".8"/><circle cx="300" cy="560" r="5" fill="#fff" opacity=".8"/>
     <path d="M330 290 q40 -20 60 10 q-30 30 -60 -10z" fill="#3FB37F"/>
     <circle cx="350" cy="330" r="28" fill="#F7D35B" opacity=".9"/><circle cx="350" cy="330" r="20" fill="#FBE79B"/>`,
    lin('sky', [['0', '#D8F0FC'], ['1', '#F7FCFF']])),
  fruta: () => svg(
    `<rect width="600" height="750" fill="#FDF3E3"/>
     <ellipse cx="300" cy="470" rx="240" ry="80" fill="#E7C9A0"/>
     <path d="M60 450 Q300 700 540 450Z" fill="#D9A86C"/>
     <circle cx="220" cy="400" r="70" fill="#EF6B5B"/><path d="M220 330 q10 -30 30 -40" stroke="#6B4E3A" stroke-width="8" fill="none"/><ellipse cx="250" cy="300" rx="22" ry="11" fill="#3FB37F"/>
     <path d="M430 330 q60 40 40 130 q-50 -20 -60 -60z" fill="#F7D35B"/>
     ${[[160, 460], [190, 480], [175, 445]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="#8A4FC8"/>`).join('')}
     <ellipse cx="420" cy="470" rx="46" ry="36" fill="#7DC36B"/>`,
    ''),
  cocinar: () => svg(
    `<rect width="600" height="750" fill="url(#wall)"/>
     <rect x="0" y="470" width="600" height="280" fill="#C9AE88"/>
     <rect x="80" y="520" width="440" height="160" rx="20" fill="#EBDDC6"/>
     ${[[160, 600, '#EF6B5B'], [240, 590, '#F5A524'], [330, 605, '#3FB37F'], [420, 590, '#E8657A']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="34" fill="${c}"/>`).join('')}
     <rect x="380" y="540" width="120" height="14" rx="7" fill="#9AA6B2" transform="rotate(-12 440 547)"/>
     <path d="M150 320 h300 v120 a40 40 0 0 1 -40 40 h-220 a40 40 0 0 1 -40 -40z" fill="#5C7A99"/>
     <rect x="130" y="300" width="340" height="28" rx="14" fill="#6E8DAD"/>
     <path d="M250 270 q-20 -40 0 -80 M300 270 q-20 -50 0 -100 M350 270 q-20 -40 0 -80" stroke="#fff" stroke-width="10" fill="none" opacity=".8" stroke-linecap="round"/>`,
    roomWall),
  correr: () => svg(
    `<rect width="600" height="750" fill="url(#sky)"/>
     <circle cx="470" cy="210" r="60" fill="#FFE7A8"/>
     <path d="M0 470 L160 380 L320 440 L470 360 L600 420 V750 H0Z" fill="#A9C8A0"/>
     <path d="M0 560 Q300 500 600 560 V750 H0Z" fill="#7FB874"/>
     <path d="M120 750 Q300 600 520 560" stroke="#E8D3A8" stroke-width="56" fill="none" stroke-linecap="round"/>
     <g fill="#243746" transform="translate(290 380)">
       <circle cx="0" cy="0" r="26"/>
       <path d="M-14 30 L18 30 L28 120 L-6 120Z"/>
       <path d="M10 40 L70 80 L62 94 L4 62Z"/><path d="M-6 40 L-60 70 L-52 84 L0 62Z"/>
       <path d="M-2 116 L-60 190 L-46 200 L20 128Z"/><path d="M18 116 L60 200 L76 194 L36 112Z"/>
     </g>
     <rect x="282" y="410" width="34" height="10" fill="#73C9F5"/>`,
    lin('sky', [['0', '#F7B98B'], ['0.6', '#FCE3B0'], ['1', '#FFF3DC']])),
  yoga: () => svg(
    `<rect width="600" height="750" fill="url(#wall)"/>
     <rect x="0" y="560" width="600" height="190" fill="#D9C3A5"/>
     <rect x="60" y="600" width="480" height="40" rx="20" fill="#8A7CF0"/>
     <g fill="#243746">
       <circle cx="300" cy="300" r="30"/>
       <path d="M280 336 h40 l10 150 h-60z"/>
       <path d="M284 350 L170 230 L184 218 L300 330Z"/><path d="M316 350 L430 230 L416 218 L300 330Z"/>
       <path d="M276 480 L230 600 L252 604 L300 500Z"/><path d="M324 480 L400 560 L372 600 L300 500Z"/>
     </g>
     <path d="M70 150 q30 -60 60 0 q-30 40 -60 0z" fill="#3FB37F"/><rect x="95" y="160" width="10" height="200" fill="#6B4E3A"/>
     <rect x="440" y="90" width="110" height="160" rx="10" fill="#EAF7FF" stroke="#fff" stroke-width="10"/>`,
    roomWall),
  libro: () => svg(
    `<rect width="600" height="750" fill="#EFE4D3"/>
     <rect x="0" y="0" width="600" height="750" fill="url(#wood)" opacity=".4"/>
     <path d="M90 300 L300 340 L510 300 L510 600 L300 640 L90 600Z" fill="#fff"/>
     <path d="M300 340 V640" stroke="#D6DCE3" stroke-width="6"/>
     ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="125" y="${360 + i * 32}" width="${130 + (i % 3) * 10}" height="8" rx="4" fill="#C8D2DC"/><rect x="330" y="${360 + i * 32}" width="${140 - (i % 2) * 20}" height="8" rx="4" fill="#C8D2DC"/>`).join('')}
     <ellipse cx="470" cy="190" rx="70" ry="22" fill="#D9C3A5"/>
     <path d="M410 120 h120 v60 a60 40 0 0 1 -120 0z" fill="#fff"/><ellipse cx="470" cy="120" rx="60" ry="14" fill="#C08552"/>
     <path d="M530 135 q40 0 30 30 q-10 20 -36 10" stroke="#fff" stroke-width="12" fill="none"/>
     <path d="M100 160 q20 -40 50 -10 q-20 30 -50 10z M120 200 q40 -20 50 20 q-30 20 -50 -20z" fill="#3FB37F"/>`,
    lin('wood', [['0', '#E3D2B8'], ['1', '#CDB38E']])),
  cama: () => svg(
    `<rect width="600" height="750" fill="url(#night)"/>
     <circle cx="440" cy="170" r="54" fill="#FFF4C2"/><circle cx="465" cy="150" r="50" fill="#33456B"/>
     ${[[100, 120], [200, 80], [300, 160], [150, 230], [520, 280]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#fff"/>`).join('')}
     <rect x="60" y="430" width="480" height="180" rx="30" fill="#EAF7FF"/>
     <rect x="60" y="360" width="40" height="300" rx="16" fill="#8DA2C0"/>
     <rect x="110" y="390" width="150" height="70" rx="30" fill="#fff"/>
     <path d="M200 440 h340 v120 h-340z" fill="#73C9F5"/><path d="M200 440 h340 v24 h-340z" fill="#A8DDF8"/>`,
    lin('night', [['0', '#24365C'], ['1', '#4A6491']])),
  meditar: () => svg(
    `<rect width="600" height="750" fill="url(#sky)"/>
     <circle cx="300" cy="420" r="120" fill="#FFE2A0" opacity=".9"/>
     <path d="M0 520 Q300 430 600 520 V750 H0Z" fill="#5B5A86"/>
     <path d="M0 590 Q300 540 600 600 V750 H0Z" fill="#3E3F66"/>
     <g fill="#26284A" transform="translate(300 460)">
       <circle cx="0" cy="-60" r="24"/>
       <path d="M-26 -34 h52 l14 70 h-80z"/>
       <path d="M-90 46 q90 -50 180 0 q-90 30 -180 0z"/>
       <path d="M-26 -20 L-56 30 L-30 34Z M26 -20 L56 30 L30 34Z"/>
     </g>`,
    sunsetSky),
  atardecer: () => svg(
    `<rect width="600" height="750" fill="url(#sky)"/>
     <circle cx="300" cy="470" r="90" fill="#FFD27A"/>
     <rect y="470" width="600" height="280" fill="#5A7FA6"/>
     ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${200 - i * 10}" y="${490 + i * 26}" width="${200 + i * 20}" height="6" rx="3" fill="#FFD27A" opacity="${0.7 - i * 0.1}"/>`).join('')}
     <path d="M0 620 Q120 580 230 640 L230 750 H0Z" fill="#2F3E58"/>
     <g stroke="#2F3E58" stroke-width="5" fill="none"><path d="M420 200 q15 -12 30 0 q15 -12 30 0"/><path d="M480 250 q10 -8 20 0 q10 -8 20 0"/></g>`,
    sunsetSky),
  movil: () => svg(
    `<rect width="600" height="750" fill="url(#wall)"/>
     <rect x="0" y="430" width="600" height="320" fill="#C9AE88"/>
     <rect x="160" y="500" width="160" height="290" rx="26" fill="#243746" transform="rotate(-14 240 640)"/>
     <rect x="176" y="516" width="128" height="250" rx="16" fill="#33475B" transform="rotate(-14 240 640)"/>
     <g transform="translate(420 420)"><path d="M-50 0 h100 l-12 110 h-76z" fill="#E28B5B"/><path d="M0 0 C-60 -60 -80 -120 -40 -170 C-20 -110 0 -60 0 0Z" fill="#3FB37F"/><path d="M0 0 C40 -70 90 -100 110 -160 C60 -130 20 -80 0 0Z" fill="#56C28C"/></g>
     <path d="M90 180 a60 60 0 1 0 0.1 0z" fill="#fff" stroke="#73C9F5" stroke-width="10"/>
     <path d="M90 140 v44 l30 20" stroke="#287CB5" stroke-width="10" fill="none" stroke-linecap="round"/>
     <rect x="380" y="140" width="140" height="190" rx="10" fill="#EAF7FF" stroke="#fff" stroke-width="10"/>`,
    roomWall),
  cafe: () => svg(
    `<rect width="600" height="750" fill="#F1E3CF"/>
     <ellipse cx="300" cy="420" rx="270" ry="200" fill="#C9AE88"/>
     ${[[200, 400], [400, 420]].map(([x, y]) => `<ellipse cx="${x}" cy="${y + 50}" rx="90" ry="26" fill="#fff"/><path d="M${x - 60} ${y - 40} h120 v60 a60 50 0 0 1 -120 0z" fill="#fff"/><ellipse cx="${x}" cy="${y - 40}" rx="60" ry="16" fill="#8B5A36"/><path d="M${x - 14} ${y - 50} q14 -16 28 0 q-14 22 -28 0z" fill="#E8C6A0"/>`).join('')}
     <g fill="#E8657A"><path d="M300 250 c-20 -30 -60 -10 -40 20 l40 36 l40 -36 c20 -30 -20 -50 -40 -20z"/></g>
     <path d="M80 640 q60 -30 120 0" stroke="#3FB37F" stroke-width="16" fill="none" stroke-linecap="round"/>`,
    ''),
  carta: () => svg(
    `<rect width="600" height="750" fill="#FCE8EB"/>
     <rect x="110" y="250" width="380" height="270" rx="16" fill="#fff"/>
     <path d="M110 260 L300 410 L490 260" stroke="#F3C1C9" stroke-width="10" fill="none"/>
     <g fill="#E8657A" transform="translate(300 420)"><path d="M0 0 c-30 -46 -90 -16 -60 30 l60 54 l60 -54 c30 -46 -30 -76 -60 -30z"/></g>
     <rect x="380" y="560" width="160" height="16" rx="8" fill="#287CB5" transform="rotate(-30 460 568)"/>
     <circle cx="120" cy="140" r="30" fill="#F7D35B" opacity=".8"/>`,
    ''),
};

export const SCENE_IDS = Object.keys(SCENES) as SceneId[];

const cache = new Map<string, string>();

export function sceneDataUrl(id: string): string {
  if (!cache.has(id)) {
    const make = SCENES[id as SceneId] ?? SCENES.sendero;
    cache.set(id, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(make())}`);
  }
  return cache.get(id)!;
}

// ---- Avatares ilustrados ---------------------------------------------------

const SKIN = ['#F5D0B5', '#E8B894', '#C98E6A', '#9B6748', '#6E4A35'];
const HAIR = ['#2B2B2B', '#5A3825', '#8C5A3C', '#C99A5B', '#A04A2A', '#3A3A50'];
const BG = ['#CFEAF8', '#E3F6EC', '#FCE8EB', '#EEEBFD', '#FEF3DE', '#DFF5F5'];

/** "avatar:<skin>-<hair>-<style>-<bg>" con índices numéricos. */
export function avatarDataUrl(spec: string): string {
  const key = `avatar:${spec}`;
  if (cache.has(key)) return cache.get(key)!;
  const [s, h, st, b] = spec.split('-').map(Number);
  const skin = SKIN[s % SKIN.length];
  const hair = HAIR[h % HAIR.length];
  const hairShapes = [
    '<path d="M60 92 q0 -52 40 -52 q40 0 40 52 q-8 -30 -40 -30 q-32 0 -40 30z"/>',
    '<path d="M56 110 q-6 -70 44 -72 q50 2 44 72 l-10 46 q4 -40 -6 -70 q-28 -6 -56 0 q-10 30 -6 70z"/>',
    '<path d="M62 88 q6 -44 38 -46 q34 2 40 46 q-20 -16 -40 -16 q-22 0 -38 16z"/><circle cx="100" cy="36" r="16"/>',
    '<path d="M58 96 q2 -58 42 -58 q40 0 42 58 q-14 -10 -24 -26 q-30 14 -60 26z"/>',
  ];
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${BG[b % BG.length]}"/>
    <path d="M40 200 q0 -56 60 -56 q60 0 60 56z" fill="${['#73C9F5', '#3FB37F', '#E8657A', '#8A7CF0', '#F5A524'][(s + st) % 5]}"/>
    <rect x="88" y="120" width="24" height="30" fill="${skin}"/>
    <ellipse cx="100" cy="96" rx="38" ry="44" fill="${skin}"/>
    <g fill="${hair}">${hairShapes[st % hairShapes.length]}</g>
    <circle cx="86" cy="100" r="4" fill="#243746"/><circle cx="114" cy="100" r="4" fill="#243746"/>
    <path d="M88 118 q12 10 24 0" stroke="#243746" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(out)}`;
  cache.set(key, url);
  return url;
}

/** Resuelve referencias que no necesitan almacenamiento. */
export function resolveStaticRef(ref: string): string | null {
  if (ref.startsWith('scene:')) return sceneDataUrl(ref.slice(6));
  if (ref.startsWith('avatar:')) return avatarDataUrl(ref.slice(7));
  if (/^(https?:|data:|blob:)/.test(ref)) return ref;
  return null;
}
