// Servidor de Dokapp: sirve la app compilada (dist/) y una API JSON sobre Postgres.
// Autenticación por correo y contraseña (scrypt) con sesión en cookie httpOnly.
// La privacidad se aplica aquí: cada consulta filtra lo que la persona puede ver.

import { createServer } from 'node:http';
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import pg from 'pg';

const scrypt = promisify(scryptCb);
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 3000);
const PROD = process.env.NODE_ENV === 'production';
const SESSION_DAYS = 60;
const PILLARS = ['ecologia', 'mental', 'emocional', 'fisica', 'alimentacion', 'digital', 'espiritual'];
const EMOTIONS = ['triste', 'enfadado', 'feliz', 'motivado', 'cansado'];

// Fechas como texto (YYYY-MM-DD) y marcas de tiempo en ISO, igual que en el cliente.
const textArray = pg.types.getTypeParser(1009);
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1182, (v) => textArray(v));
pg.types.setTypeParser(2951, (v) => textArray(v));
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString());

if (PROD && !process.env.DATABASE_URL) {
  console.error('Falta la variable DATABASE_URL: conecta una base de datos Postgres al servicio.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://dokapp:dokapp@localhost:5432/dokapp',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: 5,
});
const q = (text, params) => pool.query(text, params);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (message, status = 400) => {
  throw new HttpError(status, message);
};

// ---- Utilidades ---------------------------------------------------------------

const isUuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const str = (v, max = 1000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(pw, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}
async function checkPassword(pw, stored) {
  const [salt, hex] = stored.split(':');
  const key = await scrypt(pw, salt, 64);
  return timingSafeEqual(key, Buffer.from(hex, 'hex'));
}

function inviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (const b of randomBytes(6)) s += chars[b % chars.length];
  return `DOKA-${s}`;
}

// Una referencia a foto es "api:<uuid>" (subida aquí) o "scene:<id>" (ilustración incluida).
function checkPhotoRef(ref) {
  if (typeof ref !== 'string') fail('Foto no válida.');
  if (/^scene:[a-z-]+$/.test(ref) || ref === '') return ref;
  if (ref.startsWith('api:') && isUuid(ref.slice(4))) return ref;
  fail('Foto no válida.');
}

/** Condición SQL: la acción `a` (con su autor `p`) es visible para $1. */
const VISIBLE = `(
  a.user_id = $1
  or (a.visibility = 'public' and (p.is_public or exists(
        select 1 from follows f where f.follower_id = $1 and f.following_id = a.user_id and f.status = 'accepted')))
  or (a.visibility = 'groups' and a.group_ids && array(select group_id from group_members where user_id = $1))
)`;

// ---- Conversión fila → modelo del cliente -------------------------------------

const toProfile = (r) => ({
  id: r.id, username: r.username, name: r.name, bio: r.bio, avatar: r.avatar, isPublic: r.is_public,
  interests: r.interests, onboarded: r.onboarded, createdAt: r.created_at, shareMetricsWithGroups: r.share_metrics_with_groups,
});
const toAction = (r, me) => ({
  id: r.id, userId: r.user_id, photo: r.photo, pillar: r.pillar, description: r.description,
  emotion: r.user_id === me || r.share_emotion ? r.emotion : null,
  reflection: r.user_id === me ? r.reflection : '',
  shareEmotion: r.share_emotion, visibility: r.visibility, groupIds: r.group_ids, allowComments: r.allow_comments,
  createdAt: r.created_at, originalTakenAt: r.original_taken_at,
});
const toGroup = (r) => ({
  id: r.id, name: r.name, description: r.description, image: r.image, inviteCode: r.invite_code, createdBy: r.created_by,
  createdAt: r.created_at, weeklyGoal: r.weekly_goal, restWeekdays: r.rest_weekdays.map(Number),
});
const toMember = (r) => ({
  groupId: r.group_id, userId: r.user_id, role: r.role, joinedAt: r.joined_at, pauseFrom: r.pause_from,
  pauseUntil: r.pause_until, pauseReason: r.pause_reason, shareMetrics: r.share_metrics,
});

// ---- Autenticación --------------------------------------------------------------

function cookie(token, maxAge) {
  return `dokapp_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${PROD ? '; Secure' : ''}`;
}

async function startSession(res, userId) {
  const token = randomBytes(32).toString('base64url');
  await q(`insert into sessions (token, user_id, expires_at) values ($1, $2, now() + interval '${SESSION_DAYS} days')`, [token, userId]);
  res.setHeader('Set-Cookie', cookie(token, SESSION_DAYS * 86400));
}

async function sessionUser(req) {
  const m = /(?:^|;\s*)dokapp_session=([^;]+)/.exec(req.headers.cookie ?? '');
  if (!m) return null;
  const { rows } = await q('select user_id from sessions where token = $1 and expires_at > now()', [m[1]]);
  return rows[0]?.user_id ?? null;
}

const auth = {
  async signup(body, res) {
    const email = str(body.email, 200).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('Introduce un correo electrónico válido.');
    if (password.length < 8) fail('La contraseña debe tener al menos 8 caracteres.');
    const exists = await q('select 1 from users where email = $1', [email]);
    if (exists.rowCount) fail('Ya existe una cuenta con ese correo.');
    const base = email.split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 17) || 'persona';
    let username = base.length >= 3 ? base : `${base}doka`;
    for (let i = 2; (await q('select 1 from profiles where username = $1', [username])).rowCount; i++) username = `${base}${i}`;
    const client = await pool.connect();
    try {
      await client.query('begin');
      const { rows } = await client.query('insert into users (email, pass_hash) values ($1, $2) returning id', [email, await hashPassword(password)]);
      await client.query('insert into profiles (id, username) values ($1, $2)', [rows[0].id, username]);
      await client.query('commit');
      await startSession(res, rows[0].id);
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
    return { ok: true };
  },
  async login(body, res) {
    const { rows } = await q('select id, pass_hash from users where email = $1', [str(body.email, 200).toLowerCase()]);
    if (!rows[0] || !(await checkPassword(String(body.password ?? ''), rows[0].pass_hash))) fail('Correo o contraseña incorrectos.', 401);
    await startSession(res, rows[0].id);
    return { ok: true };
  },
  async logout(_body, res, req) {
    const m = /(?:^|;\s*)dokapp_session=([^;]+)/.exec(req.headers.cookie ?? '');
    if (m) await q('delete from sessions where token = $1', [m[1]]);
    res.setHeader('Set-Cookie', cookie('', 0));
    return { ok: true };
  },
};

// ---- Operaciones (mismo contrato que src/data/backend.ts) ------------------------

const rpc = {
  async load(me) {
    const [profile] = (await q('select * from profiles where id = $1', [me])).rows;
    if (!profile) fail('No se encuentra tu perfil.', 404);
    const groupIds = (await q('select group_id from group_members where user_id = $1', [me])).rows.map((r) => r.group_id);

    const [profiles, actions, follows, groups, members, activity, rests, goals, lessons, journal, myRest, settings] = await Promise.all([
      q('select * from profiles where onboarded or id = $1 limit 2000', [me]),
      q(`select a.* from actions a join profiles p on p.id = a.user_id
         where a.created_at > now() - interval '400 days' and ${VISIBLE}
         order by a.created_at desc limit 3000`, [me]),
      q(`select * from follows where status = 'accepted' or follower_id = $1 or following_id = $1`, [me]),
      q('select * from groups where id = any($1)', [groupIds]),
      q('select * from group_members where group_id = any($1)', [groupIds]),
      q(`select m.group_id, a.user_id, a.local_day as day, count(*)::int as count, array_agg(distinct a.pillar) as pillars
         from actions a join group_members m on m.user_id = a.user_id
         where m.group_id = any($1) and a.local_day > current_date - 400
         group by 1, 2, 3`, [groupIds]),
      q(`select m.group_id, r.user_id, r.day from rest_days r join group_members m on m.user_id = r.user_id
         where m.group_id = any($1) and r.day > current_date - 400`, [groupIds]),
      q('select * from goals where user_id = $1', [me]),
      q('select * from lesson_progress where user_id = $1', [me]),
      q('select * from journal_entries where user_id = $1 order by created_at desc', [me]),
      q('select day, reason from rest_days where user_id = $1', [me]),
      q('select settings from user_settings where user_id = $1', [me]),
    ]);

    const ids = actions.rows.map((a) => a.id);
    const [reactions, comments] = await Promise.all([
      q('select * from reactions where action_id = any($1)', [ids]),
      q('select * from comments where action_id = any($1) order by created_at', [ids]),
    ]);

    const act = new Map();
    for (const r of activity.rows) act.set(`${r.group_id}|${r.user_id}|${r.day}`, { groupId: r.group_id, userId: r.user_id, day: r.day, count: r.count, pillars: r.pillars, rest: false });
    for (const r of rests.rows) {
      const k = `${r.group_id}|${r.user_id}|${r.day}`;
      if (act.has(k)) act.get(k).rest = true;
      else act.set(k, { groupId: r.group_id, userId: r.user_id, day: r.day, count: 0, pillars: [], rest: true });
    }

    return {
      me: toProfile(profile),
      profiles: profiles.rows.map(toProfile),
      actions: actions.rows.map((r) => toAction(r, me)),
      follows: follows.rows.map((r) => ({ followerId: r.follower_id, followingId: r.following_id, status: r.status, createdAt: r.created_at })),
      groups: groups.rows.map(toGroup),
      members: members.rows.map(toMember),
      groupActivity: [...act.values()],
      reactions: reactions.rows.map((r) => ({ actionId: r.action_id, userId: r.user_id, createdAt: r.created_at })),
      comments: comments.rows.map((r) => ({ id: r.id, actionId: r.action_id, userId: r.user_id, text: r.text, createdAt: r.created_at })),
      goals: goals.rows.map((r) => ({
        id: r.id, userId: r.user_id, title: r.title, pillar: r.pillar, target: r.target, frequency: r.frequency,
        startDate: r.start_date, endDate: r.end_date, checkins: r.checkins, archived: r.archived,
      })),
      lessons: lessons.rows.map((r) => ({ lessonId: r.lesson_id, xp: r.xp, score: r.score, completedAt: r.completed_at })),
      journal: journal.rows.map((r) => ({ id: r.id, prompt: r.prompt, text: r.text, pillar: r.pillar, createdAt: r.created_at })),
      restDays: myRest.rows,
      settings: settings.rows[0]?.settings ?? null,
    };
  },

  async isUsernameAvailable(me, [username]) {
    const { rowCount } = await q('select 1 from profiles where username = $1 and id <> $2', [str(username, 40).toLowerCase(), me]);
    return rowCount === 0;
  },

  async updateProfile(me, [patch]) {
    const sets = [];
    const vals = [];
    const add = (col, v) => {
      vals.push(v);
      sets.push(`${col} = $${vals.length + 1}`);
    };
    if (patch.username !== undefined) {
      const u = str(patch.username, 40).toLowerCase();
      if (!/^[a-z0-9_.]{3,20}$/.test(u)) fail('El usuario debe tener 3–20 caracteres: letras, números, punto o guion bajo.');
      if (!(await rpc.isUsernameAvailable(me, [u]))) fail('Ese nombre de usuario ya está en uso.');
      add('username', u);
    }
    if (patch.name !== undefined) add('name', str(patch.name, 40));
    if (patch.bio !== undefined) add('bio', str(patch.bio, 160));
    if (patch.avatar !== undefined) add('avatar', checkPhotoRef(patch.avatar));
    if (patch.isPublic !== undefined) add('is_public', !!patch.isPublic);
    if (patch.interests !== undefined) add('interests', (patch.interests ?? []).filter((p) => PILLARS.includes(p)));
    if (patch.onboarded !== undefined) add('onboarded', !!patch.onboarded);
    if (patch.shareMetricsWithGroups !== undefined) add('share_metrics_with_groups', !!patch.shareMetricsWithGroups);
    if (sets.length) await q(`update profiles set ${sets.join(', ')} where id = $1`, [me, ...vals]);
  },

  async saveSettings(me, [settings]) {
    await q('insert into user_settings (user_id, settings) values ($1, $2) on conflict (user_id) do update set settings = excluded.settings', [me, JSON.stringify(settings)]);
  },

  async createAction(me, [input]) {
    if (!PILLARS.includes(input.pillar)) fail('Elige un pilar.');
    if (!['public', 'groups', 'private'].includes(input.visibility)) fail('Visibilidad no válida.');
    if (!isDay(input.localDay)) fail('Fecha no válida.');
    const diff = Math.abs(Date.parse(input.localDay) - Date.now()) / 86400000;
    if (diff > 2) fail('Fecha no válida.');
    const emotion = EMOTIONS.includes(input.emotion) ? input.emotion : null;
    const photo = checkPhotoRef(input.photo);
    const myGroups = (await q('select group_id from group_members where user_id = $1', [me])).rows.map((r) => r.group_id);
    const groupIds = input.visibility === 'groups' ? (input.groupIds ?? []).filter((g) => myGroups.includes(g)) : [];
    if (input.visibility === 'groups' && !groupIds.length) fail('Elige al menos un grupo.');
    const client = await pool.connect();
    try {
      await client.query('begin');
      // Bloqueo por persona para que dos envíos simultáneos no superen el límite.
      await client.query('select pg_advisory_xact_lock(hashtext($1))', [me]);
      const { rows: [{ n }] } = await client.query('select count(*)::int as n from actions where user_id = $1 and local_day = $2', [me, input.localDay]);
      if (n >= 3) fail('Ya has registrado tus tres acciones de hoy. ¡Mañana más!');
      const { rows } = await client.query(
        `insert into actions (user_id, photo, pillar, description, emotion, reflection, share_emotion, visibility, group_ids, allow_comments, local_day, original_taken_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
        [me, photo, input.pillar, str(input.description, 280), emotion, str(input.reflection, 1000), !!input.shareEmotion,
          input.visibility, groupIds, input.allowComments !== false, input.localDay,
          input.originalTakenAt && !isNaN(Date.parse(input.originalTakenAt)) ? input.originalTakenAt : null],
      );
      await client.query('commit');
      return toAction(rows[0], me);
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  },

  async deleteAction(me, [id]) {
    if (!isUuid(id)) return;
    const { rows } = await q('delete from actions where id = $1 and user_id = $2 returning photo', [id, me]);
    if (rows[0]?.photo.startsWith('api:')) await q('delete from photos where id = $1 and user_id = $2', [rows[0].photo.slice(4), me]);
  },

  async deleteAccount(me) {
    await q('delete from users where id = $1', [me]);
  },

  async searchUsers(me, [query]) {
    const s = str(query, 60).toLowerCase().replace(/^@/, '').replace(/[%_\\]/g, '');
    const { rows } = await q(
      `select * from profiles where onboarded and id <> $1 and ($2 = '' or username like '%' || $2 || '%' or lower(name) like '%' || $2 || '%')
       order by created_at desc limit 30`, [me, s]);
    return rows.map(toProfile);
  },

  async follow(me, [userId]) {
    if (!isUuid(userId) || userId === me) return;
    const { rows } = await q('select is_public from profiles where id = $1', [userId]);
    if (!rows[0]) fail('Ese perfil ya no existe.', 404);
    await q('insert into follows (follower_id, following_id, status) values ($1, $2, $3) on conflict do nothing', [me, userId, rows[0].is_public ? 'accepted' : 'pending']);
  },

  async unfollow(me, [userId]) {
    if (isUuid(userId)) await q('delete from follows where follower_id = $1 and following_id = $2', [me, userId]);
  },

  async respondFollow(me, [followerId, accept]) {
    if (!isUuid(followerId)) return;
    if (accept) await q(`update follows set status = 'accepted' where follower_id = $1 and following_id = $2`, [followerId, me]);
    else await q('delete from follows where follower_id = $1 and following_id = $2', [followerId, me]);
  },

  async canSeeAction(me, actionId) {
    if (!isUuid(actionId)) return null;
    const { rows } = await q(`select a.* from actions a join profiles p on p.id = a.user_id where a.id = $2 and ${VISIBLE}`, [me, actionId]);
    return rows[0] ?? null;
  },

  async toggleReaction(me, [actionId]) {
    if (!(await rpc.canSeeAction(me, actionId))) fail('Esta publicación ya no está disponible.', 404);
    const del = await q('delete from reactions where action_id = $1 and user_id = $2', [actionId, me]);
    if (!del.rowCount) await q('insert into reactions (action_id, user_id) values ($1, $2) on conflict do nothing', [actionId, me]);
  },

  async addComment(me, [actionId, text]) {
    const a = await rpc.canSeeAction(me, actionId);
    if (!a) fail('Esta publicación ya no está disponible.', 404);
    if (!a.allow_comments) fail('Los comentarios están desactivados en esta publicación.');
    const t = str(text, 500);
    if (t) await q('insert into comments (action_id, user_id, text) values ($1, $2, $3)', [actionId, me, t]);
  },

  async deleteComment(me, [id]) {
    if (!isUuid(id)) return;
    await q(`delete from comments c using actions a where c.id = $1 and a.id = c.action_id and (c.user_id = $2 or a.user_id = $2)`, [id, me]);
  },

  async createGroup(me, [input]) {
    const name = str(input.name, 60);
    if (!name) fail('Ponle un nombre al grupo.');
    const client = await pool.connect();
    try {
      await client.query('begin');
      const { rows } = await client.query(
        `insert into groups (name, description, image, invite_code, created_by, weekly_goal, rest_weekdays)
         values ($1,$2,$3,$4,$5,$6,$7) returning *`,
        [name, str(input.description, 200), checkPhotoRef(input.image ?? ''), inviteCode(), me,
          Math.min(500, Math.max(1, Number(input.weeklyGoal) || 20)), (input.restWeekdays ?? []).filter((d) => d >= 0 && d <= 6)],
      );
      await client.query(`insert into group_members (group_id, user_id, role) values ($1, $2, 'admin')`, [rows[0].id, me]);
      await client.query('commit');
      return toGroup(rows[0]);
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  },

  async joinGroup(me, [code]) {
    const { rows } = await q('select * from groups where invite_code = $1', [str(code, 20).toUpperCase()]);
    if (!rows[0]) fail('No encontramos ningún grupo con ese código.', 404);
    const share = (await q('select share_metrics_with_groups from profiles where id = $1', [me])).rows[0]?.share_metrics_with_groups ?? false;
    await q('insert into group_members (group_id, user_id, share_metrics) values ($1, $2, $3) on conflict do nothing', [rows[0].id, me, share]);
    return toGroup(rows[0]);
  },

  async leaveGroup(me, [groupId]) {
    if (!isUuid(groupId)) return;
    await q('delete from group_members where group_id = $1 and user_id = $2', [groupId, me]);
    const { rows } = await q('select user_id, role from group_members where group_id = $1 order by joined_at', [groupId]);
    if (!rows.length) await q('delete from groups where id = $1', [groupId]);
    else if (!rows.some((r) => r.role === 'admin')) await q(`update group_members set role = 'admin' where group_id = $1 and user_id = $2`, [groupId, rows[0].user_id]);
  },

  async updateGroup(me, [groupId, patch]) {
    const { rowCount } = await q(`select 1 from group_members where group_id = $1 and user_id = $2 and role = 'admin'`, [groupId, me]);
    if (!rowCount) fail('Solo las personas administradoras pueden editar el grupo.', 403);
    if (patch.name !== undefined) await q('update groups set name = $2 where id = $1', [groupId, str(patch.name, 60) || 'Grupo']);
    if (patch.description !== undefined) await q('update groups set description = $2 where id = $1', [groupId, str(patch.description, 200)]);
    if (patch.weeklyGoal !== undefined) await q('update groups set weekly_goal = $2 where id = $1', [groupId, Math.min(500, Math.max(1, Number(patch.weeklyGoal) || 20))]);
    if (patch.restWeekdays !== undefined) await q('update groups set rest_weekdays = $2 where id = $1', [groupId, patch.restWeekdays.filter((d) => d >= 0 && d <= 6)]);
  },

  async updateMembership(me, [groupId, patch]) {
    if (!isUuid(groupId)) return;
    if (patch.pauseFrom !== undefined) await q('update group_members set pause_from = $3 where group_id = $1 and user_id = $2', [groupId, me, isDay(patch.pauseFrom) ? patch.pauseFrom : null]);
    if (patch.pauseUntil !== undefined) await q('update group_members set pause_until = $3 where group_id = $1 and user_id = $2', [groupId, me, isDay(patch.pauseUntil) ? patch.pauseUntil : null]);
    if (patch.pauseReason !== undefined) await q('update group_members set pause_reason = $3 where group_id = $1 and user_id = $2', [groupId, me, str(patch.pauseReason, 120)]);
    if (patch.shareMetrics !== undefined) await q('update group_members set share_metrics = $3 where group_id = $1 and user_id = $2', [groupId, me, !!patch.shareMetrics]);
  },

  async saveGoal(me, [g]) {
    if (!isUuid(g.id) || !PILLARS.includes(g.pillar)) fail('Meta no válida.');
    const owner = (await q('select user_id from goals where id = $1', [g.id])).rows[0]?.user_id;
    if (owner && owner !== me) fail('Meta no válida.', 403);
    await q(
      `insert into goals (id, user_id, title, pillar, target, frequency, start_date, end_date, checkins, archived)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (id) do update set title = excluded.title, pillar = excluded.pillar, target = excluded.target, frequency = excluded.frequency,
         end_date = excluded.end_date, checkins = excluded.checkins, archived = excluded.archived`,
      [g.id, me, str(g.title, 80) || 'Mi meta', g.pillar, Math.min(50, Math.max(1, Number(g.target) || 1)), g.frequency === 'daily' ? 'daily' : 'weekly',
        isDay(g.startDate) ? g.startDate : new Date().toISOString().slice(0, 10), isDay(g.endDate) ? g.endDate : null,
        (g.checkins ?? []).filter(isDay).slice(-400), !!g.archived],
    );
  },

  async deleteGoal(me, [id]) {
    if (isUuid(id)) await q('delete from goals where id = $1 and user_id = $2', [id, me]);
  },

  async completeLesson(me, [p]) {
    if (!/^[a-z]+-\d$/.test(p.lessonId ?? '')) fail('Lección no válida.');
    const score = Math.max(0, Math.min(1, Number(p.score) || 0));
    // Repetir una lección no vuelve a sumar XP; solo guarda la mejor puntuación.
    await q(
      `insert into lesson_progress (user_id, lesson_id, xp, score) values ($1, $2, $3, $4)
       on conflict (user_id, lesson_id) do update set score = greatest(lesson_progress.score, excluded.score)`,
      [me, p.lessonId, Math.min(30, Math.max(0, Number(p.xp) || 0)), score],
    );
  },

  async addJournal(me, [e]) {
    await q('insert into journal_entries (id, user_id, prompt, text, pillar) values ($1, $2, $3, $4, $5) on conflict do nothing',
      [isUuid(e.id) ? e.id : randomUUID(), me, str(e.prompt, 300), str(e.text, 4000), PILLARS.includes(e.pillar) ? e.pillar : 'mental']);
  },

  async setRestDay(me, [day, reason]) {
    if (!isDay(day)) fail('Fecha no válida.');
    if (reason === null) await q('delete from rest_days where user_id = $1 and day = $2', [me, day]);
    else await q('insert into rest_days (user_id, day, reason) values ($1, $2, $3) on conflict (user_id, day) do update set reason = excluded.reason', [me, day, str(reason, 120)]);
  },
};

// ---- Fotos -------------------------------------------------------------------------

async function uploadPhoto(me, req) {
  const mime = String(req.headers['content-type'] ?? '');
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) fail('Formato de imagen no admitido.');
  const data = await readBody(req, 6 * 1024 * 1024);
  if (!data.length) fail('La imagen está vacía.');
  const { rows } = await q('insert into photos (user_id, mime, data) values ($1, $2, $3) returning id', [me, mime, data]);
  return { ref: `api:${rows[0].id}` };
}

async function servePhoto(me, id, res) {
  if (!isUuid(id)) fail('No encontrada.', 404);
  const ref = `api:${id}`;
  // Visible si es tuya, avatar de alguien, imagen de uno de tus grupos o foto de una acción que puedes ver.
  const { rows } = await q(
    `select ph.mime, ph.data from photos ph where ph.id = $2 and (
        ph.user_id = $1
        or exists(select 1 from profiles where avatar = $3)
        or exists(select 1 from groups g join group_members m on m.group_id = g.id where g.image = $3 and m.user_id = $1)
        or exists(select 1 from actions a join profiles p on p.id = a.user_id where a.photo = $3 and ${VISIBLE})
     )`, [me, id, ref]);
  if (!rows[0]) fail('No encontrada.', 404);
  res.writeHead(200, { 'Content-Type': rows[0].mime, 'Cache-Control': 'private, max-age=86400' });
  res.end(rows[0].data);
}

// ---- HTTP ---------------------------------------------------------------------------

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'El archivo es demasiado grande.'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const buf = await readBody(req, 1024 * 1024);
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    fail('Petición no válida.');
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data ?? null));
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

async function serveStatic(req, res) {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(DIST, url));
  if (!file.startsWith(DIST)) file = join(DIST, 'index.html');
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(DIST, 'index.html');
  }
  const body = await readFile(file);
  const immutable = file.includes(`${join(DIST, 'assets')}`);
  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  try {
    if (!path.startsWith('/api/')) return await serveStatic(req, res);
    if (path === '/api/health') return sendJson(res, 200, { ok: true });

    // Defensa CSRF: las peticiones que modifican datos deben venir del mismo origen.
    if (req.method !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) fail('Origen no permitido.', 403);

    const authMatch = /^\/api\/auth\/(signup|login|logout)$/.exec(path);
    if (authMatch && req.method === 'POST') return sendJson(res, 200, await auth[authMatch[1]](await readJson(req), res, req));

    const me = await sessionUser(req);
    if (path === '/api/auth/me') return sendJson(res, 200, { userId: me });
    if (!me) fail('Necesitas iniciar sesión.', 401);

    if (path === '/api/photos' && req.method === 'POST') return sendJson(res, 200, await uploadPhoto(me, req));
    const photo = /^\/api\/photos\/([^/]+)$/.exec(path);
    if (photo && req.method === 'GET') return await servePhoto(me, photo[1], res);

    const call = /^\/api\/rpc\/([a-zA-Z]+)$/.exec(path);
    if (call && req.method === 'POST' && Object.hasOwn(rpc, call[1]) && call[1] !== 'canSeeAction') {
      const body = await readJson(req);
      const result = await rpc[call[1]](me, Array.isArray(body.args) ? body.args : []);
      if (call[1] === 'deleteAccount') res.setHeader('Set-Cookie', cookie('', 0));
      return sendJson(res, 200, { result: result ?? null });
    }
    fail('No encontrado.', 404);
  } catch (e) {
    if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message });
    console.error(e);
    sendJson(res, 500, { error: 'Algo no ha ido bien en el servidor. Inténtalo de nuevo.' });
  }
});

export async function start(port = PORT) {
  await q(await readFile(join(ROOT, 'server', 'schema.sql'), 'utf8'));
  await q('delete from sessions where expires_at < now()');
  await new Promise((r) => server.listen(port, r));
  console.log(`Dokapp escuchando en el puerto ${port}`);
  return server;
}

export { pool };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
