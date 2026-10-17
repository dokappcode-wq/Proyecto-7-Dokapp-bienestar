// Backend local: toda la red social vive en este dispositivo (localStorage + IndexedDB).
// Aplica las mismas reglas de privacidad que las políticas RLS de Supabase.

import { dayKey } from '../domain/dates';
import { MAX_DAILY_ACTIONS } from '../domain/streaks';
import type {
  Goal, Group, GroupActivity, GroupMember, JournalEntry, LessonProgress, NewActionInput, Profile, Settings, Snapshot, WellnessAction,
} from '../domain/types';
import type { KV } from '../lib/kv';
import type { PhotoStore } from '../lib/photoStore';
import { resolveStaticRef } from '../lib/scenes';
import { Backend, BackendError, NewGroupInput, inviteCode, uid } from './backend';
import { LocalDB, defaultSettings, emptyDB, seedCommunity, seedDemoUser, simulateCommunity } from './seed';

const KEY = 'dokapp:db:v1';

async function hashPassword(password: string, salt: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  const enc = new TextEncoder();
  if (subtle) {
    const key = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100_000 }, key, 256);
    return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Contexto no seguro (sin WebCrypto): hash simple, solo para uso local.
  let h = 0;
  for (const c of salt + password) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return `weak-${h}`;
}

export class LocalBackend implements Backend {
  readonly kind: 'local' | 'demo';
  private db: LocalDB;
  private urls = new Map<string, string>();
  private now: () => Date;

  constructor(private kv: KV, private photos: PhotoStore, opts: { demo?: boolean; now?: () => Date } = {}) {
    this.kind = opts.demo ? 'demo' : 'local';
    this.now = opts.now ?? (() => new Date());
    const raw = kv.get(KEY);
    if (raw) {
      this.db = JSON.parse(raw) as LocalDB;
    } else {
      this.db = emptyDB();
      seedCommunity(this.db, this.now());
      if (opts.demo) seedDemoUser(this.db, this.now());
      this.save();
    }
  }

  private save() {
    try {
      this.kv.set(KEY, JSON.stringify(this.db));
    } catch {
      throw new BackendError('No queda espacio en el dispositivo para guardar los datos.');
    }
  }

  /** Relee el almacenamiento: otra pestaña (u otra instancia) puede haberlo cambiado. */
  private sync() {
    const raw = this.kv.get(KEY);
    if (raw) this.db = JSON.parse(raw) as LocalDB;
  }

  private me(): string {
    this.sync();
    if (!this.db.session) throw new BackendError('Necesitas iniciar sesión.');
    return this.db.session;
  }

  // ---- Autenticación --------------------------------------------------------

  async currentUserId() {
    this.sync();
    return this.db.session;
  }

  async signUp(email: string, password: string) {
    this.sync();
    email = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new BackendError('Introduce un correo electrónico válido.');
    if (password.length < 8) throw new BackendError('La contraseña debe tener al menos 8 caracteres.');
    if (this.db.accounts.some((a) => a.email === email)) throw new BackendError('Ya existe una cuenta con ese correo.');
    const id = uid();
    const salt = uid();
    this.db.accounts.push({ id, email, salt, hash: await hashPassword(password, salt) });
    const base = email.split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'persona';
    let username = base;
    for (let i = 2; this.db.profiles.some((p) => p.username === username); i++) username = `${base}${i}`;
    this.db.profiles.push({
      id, username, name: '', bio: '', avatar: '', isPublic: false, interests: [], onboarded: false,
      createdAt: this.now().toISOString(), shareMetricsWithGroups: false,
    });
    this.db.settings[id] = defaultSettings();
    this.db.session = id;
    this.save();
  }

  async signIn(email: string, password: string) {
    this.sync();
    const acc = this.db.accounts.find((a) => a.email === email.trim().toLowerCase());
    if (!acc || (await hashPassword(password, acc.salt)) !== acc.hash) throw new BackendError('Correo o contraseña incorrectos.');
    this.db.session = acc.id;
    this.save();
  }

  async signOut() {
    this.db.session = null;
    this.save();
  }

  /** Derecho de supresión (RGPD): borra la cuenta y todo su contenido. */
  async deleteAccount() {
    const me = this.me();
    const mine = new Set(this.db.actions.filter((a) => a.userId === me).map((a) => a.id));
    for (const a of this.db.actions) if (a.userId === me && a.photo.startsWith('idb:')) await this.photos.delete(a.photo.slice(4));
    const myAvatar = this.db.profiles.find((p) => p.id === me)?.avatar;
    if (myAvatar?.startsWith('idb:')) await this.photos.delete(myAvatar.slice(4));
    const d = this.db;
    d.actions = d.actions.filter((a) => a.userId !== me);
    d.reactions = d.reactions.filter((r) => r.userId !== me && !mine.has(r.actionId));
    d.comments = d.comments.filter((c) => c.userId !== me && !mine.has(c.actionId));
    d.follows = d.follows.filter((f) => f.followerId !== me && f.followingId !== me);
    d.members = d.members.filter((m) => m.userId !== me);
    d.goals = d.goals.filter((g) => g.userId !== me);
    d.lessons = d.lessons.filter((l) => l.userId !== me);
    d.journal = d.journal.filter((j) => j.userId !== me);
    d.restDays = d.restDays.filter((r) => r.userId !== me);
    d.profiles = d.profiles.filter((p) => p.id !== me);
    d.accounts = d.accounts.filter((a) => a.id !== me);
    delete d.settings[me];
    d.session = null;
    this.save();
  }

  // ---- Lectura ----------------------------------------------------------------

  async load(): Promise<Snapshot> {
    const me = this.me();
    const today = dayKey(this.now());
    if (this.db.simulatedUntil < today) {
      simulateCommunity(this.db, today);
      this.save();
    }
    const d = this.db;
    const profile = d.profiles.find((p) => p.id === me);
    if (!profile) throw new BackendError('No se encuentra tu perfil.');

    const myGroups = new Set(d.members.filter((m) => m.userId === me).map((m) => m.groupId));
    const following = new Set(d.follows.filter((f) => f.followerId === me && f.status === 'accepted').map((f) => f.followingId));
    const profiles = new Map(d.profiles.map((p) => [p.id, p]));

    const visible = (a: WellnessAction) => {
      if (a.userId === me) return true;
      if (a.visibility === 'public') return !!profiles.get(a.userId)?.isPublic || following.has(a.userId);
      if (a.visibility === 'groups') return a.groupIds.some((g) => myGroups.has(g));
      return false;
    };
    const actions = d.actions.filter(visible).map((a) =>
      a.userId === me ? a : { ...a, emotion: a.shareEmotion ? a.emotion : null, reflection: '' },
    );
    const ids = new Set(actions.map((a) => a.id));

    const members = d.members.filter((m) => myGroups.has(m.groupId));
    const memberIds = new Set(members.map((m) => m.userId));
    const groupActivity: GroupActivity[] = [];
    const counts = new Map<string, GroupActivity>();
    for (const a of d.actions) {
      if (!memberIds.has(a.userId)) continue;
      const day = dayKey(a.createdAt);
      for (const m of members) {
        if (m.userId !== a.userId) continue;
        const k = `${m.groupId}|${a.userId}|${day}`;
        let row = counts.get(k);
        if (!row) counts.set(k, (row = { groupId: m.groupId, userId: a.userId, day, count: 0, pillars: [], rest: false }));
        row.count++;
        if (!row.pillars.includes(a.pillar)) row.pillars.push(a.pillar);
      }
    }
    for (const r of d.restDays) {
      for (const m of members) {
        if (m.userId !== r.userId) continue;
        const k = `${m.groupId}|${r.userId}|${r.day}`;
        const row = counts.get(k);
        if (row) row.rest = true;
        else counts.set(k, { groupId: m.groupId, userId: r.userId, day: r.day, count: 0, pillars: [], rest: true });
      }
    }
    groupActivity.push(...counts.values());

    const strip = <T extends { userId: string }>(xs: T[]) => xs.filter((x) => x.userId === me).map(({ userId: _u, ...rest }) => rest);

    return {
      me: profile,
      profiles: d.profiles,
      actions,
      follows: d.follows.filter((f) => f.status === 'accepted' || f.followerId === me || f.followingId === me),
      groups: d.groups.filter((g) => myGroups.has(g.id)),
      members,
      groupActivity,
      reactions: d.reactions.filter((r) => ids.has(r.actionId)),
      comments: d.comments.filter((c) => ids.has(c.actionId)),
      goals: d.goals.filter((g) => g.userId === me),
      lessons: strip(d.lessons) as LessonProgress[],
      journal: strip(d.journal) as JournalEntry[],
      restDays: strip(d.restDays),
      settings: d.settings[me] ?? defaultSettings(),
    };
  }

  // ---- Perfil ---------------------------------------------------------------

  async isUsernameAvailable(username: string) {
    const me = this.db.session;
    return !this.db.profiles.some((p) => p.username === username && p.id !== me);
  }

  async updateProfile(patch: Partial<Profile> & { avatarBlob?: Blob }) {
    const me = this.me();
    const p = this.db.profiles.find((x) => x.id === me)!;
    const { avatarBlob, ...rest } = patch;
    if (rest.username !== undefined) {
      rest.username = rest.username.trim().toLowerCase();
      if (!/^[a-z0-9_.]{3,20}$/.test(rest.username)) throw new BackendError('El usuario debe tener 3–20 caracteres: letras, números, punto o guion bajo.');
      if (!(await this.isUsernameAvailable(rest.username))) throw new BackendError('Ese nombre de usuario ya está en uso.');
    }
    if (avatarBlob) {
      const id = uid();
      await this.photos.put(id, avatarBlob);
      if (p.avatar.startsWith('idb:')) await this.photos.delete(p.avatar.slice(4));
      rest.avatar = `idb:${id}`;
    }
    Object.assign(p, rest);
    this.save();
  }

  async saveSettings(settings: Settings) {
    this.db.settings[this.me()] = settings;
    this.save();
  }

  // ---- Acciones ---------------------------------------------------------------

  async createAction(input: NewActionInput): Promise<WellnessAction> {
    const me = this.me();
    const now = this.now();
    const todayCount = this.db.actions.filter((a) => a.userId === me && dayKey(a.createdAt) === dayKey(now)).length;
    if (todayCount >= MAX_DAILY_ACTIONS) throw new BackendError('Ya has registrado tus tres acciones de hoy. ¡Mañana más!');
    let photo: string;
    if (typeof input.photo === 'string') photo = input.photo;
    else {
      const id = uid();
      await this.photos.put(id, input.photo);
      photo = `idb:${id}`;
    }
    const myGroups = new Set(this.db.members.filter((m) => m.userId === me).map((m) => m.groupId));
    const action: WellnessAction = {
      id: uid(), userId: me, photo, pillar: input.pillar, description: input.description.trim(), emotion: input.emotion,
      reflection: input.reflection.trim(), shareEmotion: input.shareEmotion, visibility: input.visibility,
      groupIds: input.visibility === 'groups' ? input.groupIds.filter((g) => myGroups.has(g)) : [],
      allowComments: input.allowComments, createdAt: now.toISOString(), originalTakenAt: input.originalTakenAt,
    };
    if (action.visibility === 'groups' && !action.groupIds.length) throw new BackendError('Elige al menos un grupo.');
    this.db.actions.push(action);
    this.save();
    return action;
  }

  async deleteAction(id: string) {
    const me = this.me();
    const a = this.db.actions.find((x) => x.id === id && x.userId === me);
    if (!a) return;
    if (a.photo.startsWith('idb:')) await this.photos.delete(a.photo.slice(4));
    this.db.actions = this.db.actions.filter((x) => x.id !== id);
    this.db.reactions = this.db.reactions.filter((r) => r.actionId !== id);
    this.db.comments = this.db.comments.filter((c) => c.actionId !== id);
    this.save();
  }

  // ---- Social -----------------------------------------------------------------

  async searchUsers(query: string) {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    const me = this.db.session;
    return this.db.profiles
      .filter((p) => p.id !== me && p.onboarded && (!q || p.username.includes(q) || p.name.toLowerCase().includes(q)))
      .slice(0, 30);
  }

  async follow(userId: string) {
    const me = this.me();
    if (userId === me || this.db.follows.some((f) => f.followerId === me && f.followingId === userId)) return;
    const target = this.db.profiles.find((p) => p.id === userId);
    if (!target) throw new BackendError('Ese perfil ya no existe.');
    this.db.follows.push({ followerId: me, followingId: userId, status: target.isPublic ? 'accepted' : 'pending', createdAt: this.now().toISOString() });
    // Los perfiles privados de la comunidad demo aceptan automáticamente la solicitud.
    if (!target.isPublic && userId.startsWith('u-')) this.db.follows[this.db.follows.length - 1].status = 'accepted';
    this.save();
  }

  async unfollow(userId: string) {
    const me = this.me();
    this.db.follows = this.db.follows.filter((f) => !(f.followerId === me && f.followingId === userId));
    this.save();
  }

  async respondFollow(followerId: string, accept: boolean) {
    const me = this.me();
    const f = this.db.follows.find((x) => x.followerId === followerId && x.followingId === me);
    if (!f) return;
    if (accept) f.status = 'accepted';
    else this.db.follows = this.db.follows.filter((x) => x !== f);
    this.save();
  }

  async toggleReaction(actionId: string) {
    const me = this.me();
    const i = this.db.reactions.findIndex((r) => r.actionId === actionId && r.userId === me);
    if (i >= 0) this.db.reactions.splice(i, 1);
    else this.db.reactions.push({ actionId, userId: me, createdAt: this.now().toISOString() });
    this.save();
  }

  async addComment(actionId: string, text: string) {
    const me = this.me();
    const a = this.db.actions.find((x) => x.id === actionId);
    if (!a?.allowComments) throw new BackendError('Los comentarios están desactivados en esta publicación.');
    if (!text.trim()) return;
    this.db.comments.push({ id: uid(), actionId, userId: me, text: text.trim().slice(0, 500), createdAt: this.now().toISOString() });
    this.save();
  }

  async deleteComment(id: string) {
    const me = this.me();
    const c = this.db.comments.find((x) => x.id === id);
    const a = c && this.db.actions.find((x) => x.id === c.actionId);
    if (c && (c.userId === me || a?.userId === me)) {
      this.db.comments = this.db.comments.filter((x) => x.id !== id);
      this.save();
    }
  }

  // ---- Grupos -----------------------------------------------------------------

  private isAdmin(groupId: string) {
    const me = this.me();
    return this.db.members.some((m) => m.groupId === groupId && m.userId === me && m.role === 'admin');
  }

  async createGroup(input: NewGroupInput): Promise<Group> {
    const me = this.me();
    if (!input.name.trim()) throw new BackendError('Ponle un nombre al grupo.');
    let image = typeof input.image === 'string' ? input.image : '';
    if (input.image instanceof Blob) {
      const id = uid();
      await this.photos.put(id, input.image);
      image = `idb:${id}`;
    }
    const g: Group = {
      id: uid(), name: input.name.trim(), description: input.description.trim(), image, inviteCode: inviteCode(),
      createdBy: me, createdAt: this.now().toISOString(), weeklyGoal: input.weeklyGoal, restWeekdays: input.restWeekdays,
    };
    this.db.groups.push(g);
    this.db.members.push({ groupId: g.id, userId: me, role: 'admin', joinedAt: g.createdAt, pauseFrom: null, pauseUntil: null, pauseReason: '', shareMetrics: false });
    this.save();
    return g;
  }

  async joinGroup(code: string): Promise<Group> {
    const me = this.me();
    const g = this.db.groups.find((x) => x.inviteCode === code.trim().toUpperCase());
    if (!g) throw new BackendError('No encontramos ningún grupo con ese código.');
    if (!this.db.members.some((m) => m.groupId === g.id && m.userId === me)) {
      this.db.members.push({ groupId: g.id, userId: me, role: 'member', joinedAt: this.now().toISOString(), pauseFrom: null, pauseUntil: null, pauseReason: '', shareMetrics: false });
      this.save();
    }
    return g;
  }

  async leaveGroup(groupId: string) {
    const me = this.me();
    this.db.members = this.db.members.filter((m) => !(m.groupId === groupId && m.userId === me));
    const rest = this.db.members.filter((m) => m.groupId === groupId);
    if (!rest.length) this.db.groups = this.db.groups.filter((g) => g.id !== groupId);
    else if (!rest.some((m) => m.role === 'admin')) rest[0].role = 'admin';
    this.save();
  }

  async updateGroup(groupId: string, patch: Partial<Pick<Group, 'name' | 'description' | 'weeklyGoal' | 'restWeekdays'>>) {
    if (!this.isAdmin(groupId)) throw new BackendError('Solo las personas administradoras pueden editar el grupo.');
    Object.assign(this.db.groups.find((g) => g.id === groupId)!, patch);
    this.save();
  }

  async updateMembership(groupId: string, patch: Partial<Pick<GroupMember, 'pauseFrom' | 'pauseUntil' | 'pauseReason' | 'shareMetrics'>>) {
    const me = this.me();
    const m = this.db.members.find((x) => x.groupId === groupId && x.userId === me);
    if (m) Object.assign(m, patch);
    this.save();
  }

  // ---- Objetivos, aprendizaje y descanso ---------------------------------------

  async saveGoal(goal: Goal) {
    const me = this.me();
    const g = { ...goal, userId: me };
    const i = this.db.goals.findIndex((x) => x.id === goal.id && x.userId === me);
    if (i >= 0) this.db.goals[i] = g;
    else this.db.goals.push(g);
    this.save();
  }

  async deleteGoal(id: string) {
    const me = this.me();
    this.db.goals = this.db.goals.filter((g) => !(g.id === id && g.userId === me));
    this.save();
  }

  async completeLesson(progress: LessonProgress) {
    const me = this.me();
    const prev = this.db.lessons.find((l) => l.userId === me && l.lessonId === progress.lessonId);
    // Repetir una lección no vuelve a sumar XP; solo guarda la mejor puntuación.
    if (prev) prev.score = Math.max(prev.score, progress.score);
    else this.db.lessons.push({ ...progress, userId: me });
    this.save();
  }

  async addJournal(entry: JournalEntry) {
    this.db.journal.push({ ...entry, userId: this.me() });
    this.save();
  }

  async setRestDay(day: string, reason: string | null) {
    const me = this.me();
    this.db.restDays = this.db.restDays.filter((r) => !(r.userId === me && r.day === day));
    if (reason !== null) this.db.restDays.push({ userId: me, day, reason });
    this.save();
  }

  // ---- Fotos ------------------------------------------------------------------

  async resolvePhoto(ref: string): Promise<string> {
    const s = resolveStaticRef(ref);
    if (s !== null) return s;
    if (ref.startsWith('idb:')) {
      const id = ref.slice(4);
      if (!this.urls.has(id)) {
        const blob = await this.photos.get(id);
        if (!blob) return '';
        this.urls.set(id, URL.createObjectURL(blob));
      }
      return this.urls.get(id)!;
    }
    return '';
  }
}
