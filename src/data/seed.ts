// Comunidad de demostración. Se genera de forma determinista y se "simula"
// día a día para que el feed siga vivo aunque abras la app semanas después.

import { addDays, dayKey, parseDay, shiftDay } from '../domain/dates';
import { DEFAULT_WEIGHTS } from '../domain/scoring';
import type {
  Comment, EmotionId, Follow, Goal, Group, GroupMember, LessonProgress, PillarId, Profile, Reaction, Settings, WellnessAction,
} from '../domain/types';
import type { SceneId } from '../lib/scenes';

export interface LocalDB {
  version: 1;
  accounts: { id: string; email: string; salt: string; hash: string }[];
  session: string | null;
  profiles: Profile[];
  actions: WellnessAction[];
  follows: Follow[];
  groups: Group[];
  members: GroupMember[];
  reactions: Reaction[];
  comments: Comment[];
  goals: Goal[];
  lessons: (LessonProgress & { userId: string })[];
  journal: ({ userId: string } & { id: string; prompt: string; text: string; pillar: PillarId; createdAt: string })[];
  restDays: { userId: string; day: string; reason: string }[];
  settings: Record<string, Settings>;
  simulatedUntil: string;
}

export const defaultSettings = (): Settings => ({
  weights: { ...DEFAULT_WEIGHTS },
  remindersEnabled: true,
  keepOriginalPhotoDate: true,
});

export function emptyDB(): LocalDB {
  return {
    version: 1, accounts: [], session: null, profiles: [], actions: [], follows: [], groups: [], members: [],
    reactions: [], comments: [], goals: [], lessons: [], journal: [], restDays: [], settings: {}, simulatedUntil: '',
  };
}

// ---- Generador pseudoaleatorio determinista -------------------------------

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// ---- Catálogo de acciones de ejemplo ---------------------------------------

const IDEAS: Record<PillarId, { scene: SceneId; text: string }[]> = {
  ecologia: [
    { scene: 'sendero', text: 'Paseo al amanecer por el monte' },
    { scene: 'bosque', text: 'Ruta por el bosque con la familia' },
    { scene: 'planta', text: 'He trasplantado mi monstera' },
    { scene: 'bici', text: 'Hoy al trabajo en bici' },
  ],
  mental: [
    { scene: 'cama', text: 'A la cama antes de las 23:00' },
    { scene: 'libro', text: 'Media hora de lectura con té' },
  ],
  emocional: [
    { scene: 'cafe', text: 'Café largo con una amiga a la que no veía' },
    { scene: 'carta', text: 'He escrito una carta de agradecimiento' },
  ],
  fisica: [
    { scene: 'correr', text: '5 km a ritmo suave' },
    { scene: 'yoga', text: 'Yoga de 20 minutos al despertar' },
    { scene: 'sendero', text: 'Subida al mirador' },
  ],
  alimentacion: [
    { scene: 'ensalada', text: 'Bowl de quinoa, aguacate y verduras' },
    { scene: 'agua', text: 'Dos litros de agua hoy' },
    { scene: 'fruta', text: 'Merienda de fruta de temporada' },
    { scene: 'cocinar', text: 'Cocinando el menú de la semana' },
  ],
  digital: [
    { scene: 'movil', text: 'Tarde sin móvil, boca abajo y en silencio' },
    { scene: 'libro', text: 'Leer en papel en vez de hacer scroll' },
  ],
  espiritual: [
    { scene: 'meditar', text: '10 minutos de meditación al atardecer' },
    { scene: 'atardecer', text: 'Contemplando el atardecer en la playa' },
  ],
};

const EMOS: EmotionId[] = ['feliz', 'motivado', 'feliz', 'motivado', 'cansado', 'feliz', 'triste', 'enfadado'];

interface Persona {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatar: string;
  isPublic: boolean;
  likes: PillarId[];
  /** Probabilidad de registrar al menos una acción cada día. */
  activity: number;
}

export const DEMO_ME_ID = 'u-alex';

const PERSONAS: Persona[] = [
  { id: 'u-marta', username: 'marta', name: 'Marta Ruiz', bio: 'Montaña, yoga y pan casero 🌿', avatar: 'avatar:0-1-1-1', isPublic: true, likes: ['ecologia', 'fisica', 'alimentacion'], activity: 1 },
  { id: 'u-iker', username: 'iker', name: 'Iker Etxeberria', bio: 'Corredor lento, lector rápido.', avatar: 'avatar:1-0-0-0', isPublic: true, likes: ['fisica', 'mental', 'digital'], activity: 1 },
  { id: 'u-lucia', username: 'lucia', name: 'Lucía Gómez', bio: 'Aprendiendo a parar ✨', avatar: 'avatar:2-2-3-2', isPublic: true, likes: ['espiritual', 'emocional', 'mental'], activity: 1 },
  { id: 'u-ander', username: 'ander', name: 'Ander López', bio: 'Bici a todas partes 🚲', avatar: 'avatar:1-1-0-5', isPublic: true, likes: ['ecologia', 'fisica'], activity: 0.8 },
  { id: 'u-nerea', username: 'nerea', name: 'Nerea Sanz', bio: 'Nutricionista en prácticas 🥗', avatar: 'avatar:0-4-1-4', isPublic: true, likes: ['alimentacion', 'emocional'], activity: 0.85 },
  { id: 'u-pablo', username: 'pablo', name: 'Pablo Martín', bio: 'Menos pantallas, más plantas.', avatar: 'avatar:3-0-2-3', isPublic: false, likes: ['digital', 'ecologia'], activity: 1 },
  { id: 'u-sara', username: 'sara', name: 'Sara Domínguez', bio: 'Meditación y café ☕', avatar: 'avatar:4-0-1-1', isPublic: true, likes: ['espiritual', 'alimentacion'], activity: 1 },
  { id: 'u-hugo', username: 'hugo', name: 'Hugo Navarro', bio: 'Entrenando para mi primera media maratón', avatar: 'avatar:2-5-0-0', isPublic: true, likes: ['fisica', 'alimentacion'], activity: 1 },
  { id: 'u-carmen', username: 'carmen', name: 'Carmen Vidal', bio: 'Jubilada activa y curiosa.', avatar: 'avatar:0-3-3-2', isPublic: true, likes: ['ecologia', 'espiritual', 'emocional'], activity: 0.7 },
];

/** Grupo de ejemplo: el de las capturas ("Los buenos hábitos", racha de 12 días). */
export const DEMO_GROUP_ID = 'g-buenos-habitos';
const GROUP_MEMBERS = ['u-marta', 'u-iker', 'u-lucia', 'u-pablo', 'u-sara', 'u-hugo', 'u-nerea'];
/** Miembro que hoy aún no ha registrado su acción ("7 de 8"). */
const LATE_TODAY = 'u-nerea';
const GROUP_STREAK = 12;

const COMMENTS = ['¡Qué buena pinta! 😍', '¡Me apunto la próxima vez!', 'Qué bonito sitio', '¡Bravo! 💪', 'Gracias por inspirar 🙌', 'Necesito esa receta'];

function at(day: string, hour: number, minute: number): string {
  const d = parseDay(day);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function makeAction(userId: string, day: string, idx: number, r: () => number, forcePillar?: PillarId, likes?: PillarId[]): WellnessAction {
  const pool: PillarId[] = likes && r() < 0.7 ? likes : (Object.keys(IDEAS) as PillarId[]);
  const pillar = forcePillar ?? pool[Math.floor(r() * pool.length)];
  const ideas = IDEAS[pillar];
  const idea = ideas[Math.floor(r() * ideas.length)];
  const hour = [8, 13, 19][idx] + Math.floor(r() * 3);
  const emo = EMOS[Math.floor(r() * EMOS.length)];
  // En la comunidad de ejemplo solo se comparten emociones coherentes con la acción.
  const shareEmotion = r() < 0.5 && (emo === 'feliz' || emo === 'motivado');
  return {
    id: `a-${userId}-${day}-${idx}`,
    userId,
    photo: `scene:${idea.scene}`,
    pillar,
    description: idea.text,
    emotion: emo,
    reflection: r() < 0.4 ? 'Me ha sentado genial hacerlo.' : '',
    shareEmotion,
    visibility: r() < 0.8 ? 'public' : 'groups',
    groupIds: [],
    allowComments: true,
    createdAt: at(day, hour, Math.floor(r() * 60)),
    originalTakenAt: null,
  };
}

/** Genera la actividad de la comunidad para los días (startDay, untilDay]. */
export function simulateCommunity(db: LocalDB, untilDay: string) {
  const from = db.simulatedUntil || shiftDay(untilDay, -40);
  const groupIds = db.groups.filter((g) => g.id === DEMO_GROUP_ID).map((g) => g.id);
  // Se repasa también el último día simulado: quien aún no había publicado puede hacerlo ahora.
  for (let day = db.simulatedUntil ? from : shiftDay(from, 1); day <= untilDay; day = shiftDay(day, 1)) {
    for (const p of PERSONAS) {
      if (db.actions.some((a) => a.id.startsWith(`a-${p.id}-${day}`))) continue;
      const r = rng(`${p.id}:${day}`);
      const inGroup = GROUP_MEMBERS.includes(p.id);
      const daysAgo = Math.round((parseDay(untilDay).getTime() - parseDay(day).getTime()) / 86400000);
      // Los miembros del grupo mantienen la racha; el día GROUP_STREAK+1 Iker descansó y la cortó.
      let active = r() < p.activity;
      if (inGroup && daysAgo >= 1 && daysAgo <= GROUP_STREAK) active = true;
      if (p.id === 'u-iker' && daysAgo === GROUP_STREAK + 1) active = false;
      if (p.id === LATE_TODAY && daysAgo === 0) active = false;
      if (!active) continue;
      const n = 1 + (r() < 0.45 ? 1 : 0) + (r() < 0.15 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const a = makeAction(p.id, day, i, r, undefined, p.likes);
        // Hoy, que la hora no supere el momento actual para no publicar "en el futuro".
        if (daysAgo === 0 && new Date(a.createdAt) > new Date()) a.createdAt = new Date(Date.now() - (i + 1) * 47 * 60000).toISOString();
        if (a.visibility === 'groups') a.groupIds = inGroup ? groupIds : [];
        if (a.visibility === 'groups' && !a.groupIds.length) a.visibility = 'public';
        db.actions.push(a);
        // Reacciones y comentarios cruzados para dar vida al feed.
        for (const other of PERSONAS) {
          if (other.id !== p.id && r() < 0.35) db.reactions.push({ actionId: a.id, userId: other.id, createdAt: a.createdAt });
        }
        if (r() < 0.25) {
          const other = PERSONAS[Math.floor(r() * PERSONAS.length)];
          if (other.id !== p.id) {
            db.comments.push({ id: `c-${a.id}`, actionId: a.id, userId: other.id, text: COMMENTS[Math.floor(r() * COMMENTS.length)], createdAt: a.createdAt });
          }
        }
      }
    }
  }
  db.simulatedUntil = untilDay;
}

/** Crea la comunidad de ejemplo y el grupo "Los buenos hábitos". */
export function seedCommunity(db: LocalDB, today: Date) {
  const created = addDays(today, -60).toISOString();
  for (const p of PERSONAS) {
    db.profiles.push({
      id: p.id, username: p.username, name: p.name, bio: p.bio, avatar: p.avatar, isPublic: p.isPublic,
      interests: p.likes, onboarded: true, createdAt: created, shareMetricsWithGroups: true,
    });
  }
  // La comunidad se sigue entre sí.
  for (const a of PERSONAS) for (const b of PERSONAS) {
    if (a.id !== b.id && (a.id.length + b.id.length) % 3 !== 0) db.follows.push({ followerId: a.id, followingId: b.id, status: 'accepted', createdAt: created });
  }
  db.groups.push({
    id: DEMO_GROUP_ID, name: 'Los buenos hábitos', description: 'Un grupo para animarnos a cuidarnos un poquito cada día.',
    image: 'scene:sendero', inviteCode: 'DOKA-HABITOS', createdBy: 'u-marta', createdAt: addDays(today, -45).toISOString(),
    weeklyGoal: 40, restWeekdays: [],
  });
  GROUP_MEMBERS.forEach((u, i) => db.members.push({
    groupId: DEMO_GROUP_ID, userId: u, role: i === 0 ? 'admin' : 'member', joinedAt: addDays(today, -45).toISOString(),
    pauseFrom: null, pauseUntil: null, pauseReason: '', shareMetrics: true,
  }));
  db.groups.push({
    id: 'g-reto-30', name: 'Reto bienestar 30 días', description: 'Treinta días, siete pilares. ¿Te apuntas?',
    image: 'scene:meditar', inviteCode: 'DOKA-RETO30', createdBy: 'u-lucia', createdAt: addDays(today, -20).toISOString(),
    weeklyGoal: 25, restWeekdays: [0],
  });
  ['u-lucia', 'u-sara', 'u-carmen', 'u-hugo'].forEach((u, i) => db.members.push({
    groupId: 'g-reto-30', userId: u, role: i === 0 ? 'admin' : 'member', joinedAt: addDays(today, -20).toISOString(),
    pauseFrom: null, pauseUntil: null, pauseReason: '', shareMetrics: true,
  }));
  simulateCommunity(db, dayKey(today));
}

/** Usuario de demostración "Alex" con dos meses de historial (modo demo y capturas). */
export function seedDemoUser(db: LocalDB, today: Date) {
  const id = DEMO_ME_ID;
  const created = addDays(today, -62);
  db.profiles.push({
    id, username: 'alexmundo', name: 'Alex', bio: 'Pequeñas acciones, grandes cambios 🐢', avatar: 'avatar:1-2-0-0',
    isPublic: true, interests: ['ecologia', 'fisica', 'alimentacion', 'mental'], onboarded: true,
    createdAt: created.toISOString(), shareMetricsWithGroups: true,
  });
  db.settings[id] = defaultSettings();
  db.session = id;
  for (const p of PERSONAS.slice(0, 8)) {
    db.follows.push({ followerId: id, followingId: p.id, status: 'accepted', createdAt: created.toISOString() });
  }
  for (const p of PERSONAS.slice(0, 6)) db.follows.push({ followerId: p.id, followingId: id, status: 'accepted', createdAt: created.toISOString() });
  db.follows.push({ followerId: 'u-carmen', followingId: id, status: 'accepted', createdAt: created.toISOString() });
  db.members.push({
    groupId: DEMO_GROUP_ID, userId: id, role: 'member', joinedAt: addDays(today, -45).toISOString(),
    pauseFrom: null, pauseUntil: null, pauseReason: '', shareMetrics: true,
  });

  const todayKey = dayKey(today);
  const likes: PillarId[] = ['ecologia', 'fisica', 'alimentacion', 'mental', 'emocional'];
  for (let back = 60; back >= 1; back--) {
    const day = shiftDay(todayKey, -back);
    const r = rng(`alex:${day}`);
    // Racha actual de 12 días (coincide con el grupo); antes, algún hueco.
    if (back === GROUP_STREAK + 1 || (back > GROUP_STREAK && r() < 0.25)) continue;
    const n = 1 + (r() < 0.55 ? 1 : 0) + (r() < 0.2 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const a = makeAction(id, day, i, r, undefined, likes);
      a.visibility = r() < 0.7 ? 'public' : r() < 0.5 ? 'groups' : 'private';
      a.groupIds = a.visibility === 'groups' ? [DEMO_GROUP_ID] : [];
      a.shareEmotion = false;
      db.actions.push(a);
    }
  }
  // Hoy: dos de tres acciones (naturaleza a las 09:41 y alimentación a las 13:16).
  const todayActs: [PillarId, SceneId, string, number, number, EmotionId][] = [
    ['ecologia', 'sendero', 'Paseo al amanecer antes de trabajar', 9, 41, 'feliz'],
    ['alimentacion', 'ensalada', 'Bowl de verduras y quinoa casero', 13, 16, 'motivado'],
  ];
  todayActs.forEach(([pillar, scene, text, h, m, emo], i) => {
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    if (d > today) d.setTime(today.getTime() - (2 - i) * 60 * 60000);
    db.actions.push({
      id: `a-${id}-${todayKey}-${i}`, userId: id, photo: `scene:${scene}`, pillar, description: text, emotion: emo,
      reflection: i === 0 ? 'Empezar el día fuera me da energía.' : '', shareEmotion: true, visibility: 'public',
      groupIds: [], allowComments: true, createdAt: d.toISOString(), originalTakenAt: null,
    });
  });
  for (const a of db.actions.filter((x) => x.userId === id)) {
    for (const p of PERSONAS) if (rng(`${a.id}${p.id}`)() < 0.3) db.reactions.push({ actionId: a.id, userId: p.id, createdAt: a.createdAt });
  }
  db.comments.push({ id: 'c-alex-today', actionId: `a-${id}-${todayKey}-0`, userId: 'u-marta', text: '¡Qué luz tan bonita! 🌄', createdAt: today.toISOString() });

  const goal = (gid: string, title: string, pillar: PillarId, target: number, frequency: 'daily' | 'weekly'): Goal => ({
    id: gid, userId: id, title, pillar, target, frequency, startDate: shiftDay(todayKey, -28), endDate: null, checkins: [], archived: false,
  });
  db.goals.push(
    goal('goal-1', 'Caminar tres veces por semana', 'fisica', 3, 'weekly'),
    goal('goal-2', 'Leer diez minutos al día', 'mental', 1, 'daily'),
    goal('goal-3', 'Reducir el tiempo en redes sociales', 'digital', 4, 'weekly'),
    goal('goal-4', 'Meditar cuatro veces por semana', 'espiritual', 4, 'weekly'),
    goal('goal-5', 'Cocinar en casa entre semana', 'alimentacion', 5, 'weekly'),
  );
  // Algunos check-ins manuales en los objetivos de lectura.
  for (let i = 0; i < 20; i += 2) db.goals[1].checkins.push(shiftDay(todayKey, -i));

  const done: [string, number][] = [
    ['mental-1', 25], ['mental-2', 20], ['mental-3', 25], ['ecologia-1', 25], ['ecologia-2', 20],
    ['fisica-1', 25], ['alimentacion-1', 20], ['emocional-1', 25], ['digital-1', 20],
  ];
  done.forEach(([lessonId, xp], i) => db.lessons.push({ userId: id, lessonId, xp, score: xp === 25 ? 1 : 0.5, completedAt: addDays(today, -(done.length - i)).toISOString() }));
  db.restDays.push({ userId: id, day: shiftDay(todayKey, -20), reason: 'Día de descanso' });
}
