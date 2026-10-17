// Backend Supabase: se activa al definir VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
// La privacidad la garantizan las políticas RLS de supabase/schema.sql.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { addDays, dayKey } from '../domain/dates';
import type {
  Goal, Group, GroupMember, JournalEntry, LessonProgress, NewActionInput, Profile, Settings, Snapshot, WellnessAction,
} from '../domain/types';
import { resolveStaticRef } from '../lib/scenes';
import { Backend, BackendError, NewGroupInput, uid } from './backend';
import { defaultSettings } from './seed';

type Row = Record<string, any>;

const toProfile = (r: Row): Profile => ({
  id: r.id, username: r.username, name: r.name, bio: r.bio, avatar: r.avatar, isPublic: r.is_public,
  interests: r.interests ?? [], onboarded: r.onboarded, createdAt: r.created_at, shareMetricsWithGroups: r.share_metrics_with_groups,
});

const toGroup = (r: Row): Group => ({
  id: r.id, name: r.name, description: r.description, image: r.image, inviteCode: r.invite_code, createdBy: r.created_by,
  createdAt: r.created_at, weeklyGoal: r.weekly_goal, restWeekdays: r.rest_weekdays ?? [],
});

const toMember = (r: Row): GroupMember => ({
  groupId: r.group_id, userId: r.user_id, role: r.role, joinedAt: r.joined_at, pauseFrom: r.pause_from,
  pauseUntil: r.pause_until, pauseReason: r.pause_reason, shareMetrics: r.share_metrics,
});

const toGoal = (r: Row): Goal => ({
  id: r.id, userId: r.user_id, title: r.title, pillar: r.pillar, target: r.target, frequency: r.frequency,
  startDate: r.start_date, endDate: r.end_date, checkins: r.checkins ?? [], archived: r.archived,
});

function must<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R['data']> {
  if (res.error) throw new BackendError(translate(res.error.message));
  return res.data as NonNullable<R['data']>;
}

function translate(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/already registered/i.test(msg)) return 'Ya existe una cuenta con ese correo.';
  if (/Password should be/i.test(msg)) return 'La contraseña debe tener al menos 8 caracteres.';
  if (/duplicate key.*username/i.test(msg)) return 'Ese nombre de usuario ya está en uso.';
  if (/Failed to fetch|NetworkError|fetch failed|Load failed/i.test(msg)) return 'No se puede conectar con el servidor. Comprueba tu conexión y la configuración de config.js.';
  if (/Email not confirmed/i.test(msg)) return 'Confirma tu correo antes de iniciar sesión.';
  return msg;
}

export class SupabaseBackend implements Backend {
  readonly kind = 'supabase' as const;
  private sb: SupabaseClient;
  private urls = new Map<string, string>();

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  }

  private async me(): Promise<string> {
    const id = await this.currentUserId();
    if (!id) throw new BackendError('Necesitas iniciar sesión.');
    return id;
  }

  private async upload(blob: Blob): Promise<string> {
    const path = `${await this.me()}/${uid()}.jpg`;
    must(await this.sb.storage.from('photos').upload(path, blob, { contentType: blob.type || 'image/jpeg' }));
    return path;
  }

  async currentUserId() {
    const { data } = await this.sb.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async signUp(email: string, password: string) {
    const data = must(await this.sb.auth.signUp({ email, password }));
    if (!data.session) throw new BackendError('Te hemos enviado un correo para confirmar tu cuenta. Después, inicia sesión.');
  }

  async signIn(email: string, password: string) {
    must(await this.sb.auth.signInWithPassword({ email, password }));
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  async deleteAccount() {
    const me = await this.me();
    const files = must(await this.sb.storage.from('photos').list(me, { limit: 1000 }));
    if (files.length) await this.sb.storage.from('photos').remove(files.map((f) => `${me}/${f.name}`));
    must(await this.sb.rpc('delete_my_account'));
    await this.sb.auth.signOut();
  }

  async load(): Promise<Snapshot> {
    const me = await this.me();
    const since = addDays(new Date(), -400).toISOString();
    const sinceDay = dayKey(addDays(new Date(), -400));
    const q = this.sb;
    const [profiles, actions, priv, follows, groups, members, activity, reactions, comments, goals, lessons, journal, rest, settings] =
      await Promise.all([
        q.from('profiles').select('*').limit(1000),
        q.from('actions').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(3000),
        q.from('action_private').select('*'),
        q.from('follows').select('*'),
        q.from('groups').select('*'),
        q.from('group_members').select('*'),
        q.rpc('group_activity', { since: sinceDay }),
        q.from('reactions').select('*').gte('created_at', since),
        q.from('comments').select('*').gte('created_at', since),
        q.from('goals').select('*'),
        q.from('lesson_progress').select('*'),
        q.from('journal_entries').select('*'),
        q.from('rest_days').select('*'),
        q.from('user_settings').select('*').maybeSingle(),
      ]);
    const privMap = new Map((must(priv) as Row[]).map((r) => [r.action_id, r]));
    const allProfiles = (must(profiles) as Row[]).map(toProfile);
    const mine = allProfiles.find((p) => p.id === me);
    if (!mine) throw new BackendError('No se encuentra tu perfil.');

    return {
      me: mine,
      profiles: allProfiles,
      actions: (must(actions) as Row[]).map((r): WellnessAction => {
        const p = privMap.get(r.id);
        return {
          id: r.id, userId: r.user_id, photo: r.photo, pillar: r.pillar, description: r.description,
          emotion: p?.emotion ?? r.shared_emotion ?? null, reflection: p?.reflection ?? '', shareEmotion: r.share_emotion,
          visibility: r.visibility, groupIds: r.group_ids ?? [], allowComments: r.allow_comments, createdAt: r.created_at,
          originalTakenAt: r.original_taken_at,
        };
      }),
      follows: (must(follows) as Row[]).map((r) => ({ followerId: r.follower_id, followingId: r.following_id, status: r.status, createdAt: r.created_at })),
      groups: (must(groups) as Row[]).map(toGroup),
      members: (must(members) as Row[]).map(toMember),
      groupActivity: ((must(activity) as Row[] | null) ?? []).map((r) => ({
        groupId: r.group_id, userId: r.user_id, day: r.day, count: r.count, pillars: r.pillars ?? [], rest: r.rest,
      })),
      reactions: (must(reactions) as Row[]).map((r) => ({ actionId: r.action_id, userId: r.user_id, createdAt: r.created_at })),
      comments: (must(comments) as Row[]).map((r) => ({ id: r.id, actionId: r.action_id, userId: r.user_id, text: r.text, createdAt: r.created_at })),
      goals: (must(goals) as Row[]).map(toGoal),
      lessons: (must(lessons) as Row[]).map((r) => ({ lessonId: r.lesson_id, xp: r.xp, score: r.score, completedAt: r.completed_at })),
      journal: (must(journal) as Row[]).map((r) => ({ id: r.id, prompt: r.prompt, text: r.text, pillar: r.pillar, createdAt: r.created_at })),
      restDays: (must(rest) as Row[]).map((r) => ({ day: r.day, reason: r.reason })),
      settings: (must(settings) as Row | null)?.settings ?? defaultSettings(),
    };
  }

  async isUsernameAvailable(username: string) {
    const me = await this.currentUserId();
    const rows = must(await this.sb.from('profiles').select('id').eq('username', username)) as Row[];
    return !rows.some((r) => r.id !== me);
  }

  async updateProfile(patch: Partial<Profile> & { avatarBlob?: Blob }) {
    const me = await this.me();
    const row: Row = {};
    if (patch.username !== undefined) row.username = patch.username.trim().toLowerCase();
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.isPublic !== undefined) row.is_public = patch.isPublic;
    if (patch.interests !== undefined) row.interests = patch.interests;
    if (patch.onboarded !== undefined) row.onboarded = patch.onboarded;
    if (patch.shareMetricsWithGroups !== undefined) row.share_metrics_with_groups = patch.shareMetricsWithGroups;
    if (patch.avatar !== undefined) row.avatar = patch.avatar;
    if (patch.avatarBlob) row.avatar = await this.upload(patch.avatarBlob);
    must(await this.sb.from('profiles').update(row).eq('id', me));
  }

  async saveSettings(settings: Settings) {
    must(await this.sb.from('user_settings').upsert({ user_id: await this.me(), settings }));
  }

  async createAction(input: NewActionInput): Promise<WellnessAction> {
    const me = await this.me();
    const photo = typeof input.photo === 'string' ? input.photo : await this.upload(input.photo);
    const row = must(await this.sb.from('actions').insert({
      user_id: me, photo, pillar: input.pillar, description: input.description.trim(), share_emotion: input.shareEmotion,
      shared_emotion: input.shareEmotion ? input.emotion : null, visibility: input.visibility,
      group_ids: input.visibility === 'groups' ? input.groupIds : [], allow_comments: input.allowComments,
      local_day: dayKey(new Date()), original_taken_at: input.originalTakenAt,
    }).select().single()) as Row;
    must(await this.sb.from('action_private').insert({ action_id: row.id, user_id: me, emotion: input.emotion, reflection: input.reflection.trim() }));
    return {
      id: row.id, userId: me, photo, pillar: input.pillar, description: row.description, emotion: input.emotion,
      reflection: input.reflection, shareEmotion: input.shareEmotion, visibility: input.visibility, groupIds: row.group_ids,
      allowComments: input.allowComments, createdAt: row.created_at, originalTakenAt: input.originalTakenAt,
    };
  }

  async deleteAction(id: string) {
    const row = must(await this.sb.from('actions').select('photo').eq('id', id).maybeSingle()) as Row | null;
    must(await this.sb.from('actions').delete().eq('id', id));
    if (row && !resolveStaticRef(row.photo)) await this.sb.storage.from('photos').remove([row.photo]);
  }

  async searchUsers(query: string) {
    const me = await this.me();
    const qq = query.trim().replace(/^@/, '').replace(/[%_,()]/g, '');
    let req = this.sb.from('profiles').select('*').eq('onboarded', true).neq('id', me).limit(30);
    if (qq) req = req.or(`username.ilike.%${qq}%,name.ilike.%${qq}%`);
    return (must(await req) as Row[]).map(toProfile);
  }

  async follow(userId: string) {
    must(await this.sb.from('follows').insert({ follower_id: await this.me(), following_id: userId }));
  }

  async unfollow(userId: string) {
    must(await this.sb.from('follows').delete().eq('follower_id', await this.me()).eq('following_id', userId));
  }

  async respondFollow(followerId: string, accept: boolean) {
    const me = await this.me();
    const q = this.sb.from('follows');
    if (accept) must(await q.update({ status: 'accepted' }).eq('follower_id', followerId).eq('following_id', me));
    else must(await q.delete().eq('follower_id', followerId).eq('following_id', me));
  }

  async toggleReaction(actionId: string) {
    const me = await this.me();
    const existing = must(await this.sb.from('reactions').select('action_id').eq('action_id', actionId).eq('user_id', me)) as Row[];
    if (existing.length) must(await this.sb.from('reactions').delete().eq('action_id', actionId).eq('user_id', me));
    else must(await this.sb.from('reactions').insert({ action_id: actionId, user_id: me }));
  }

  async addComment(actionId: string, text: string) {
    if (!text.trim()) return;
    must(await this.sb.from('comments').insert({ action_id: actionId, user_id: await this.me(), text: text.trim().slice(0, 500) }));
  }

  async deleteComment(id: string) {
    must(await this.sb.from('comments').delete().eq('id', id));
  }

  async createGroup(input: NewGroupInput): Promise<Group> {
    const image = typeof input.image === 'string' ? input.image : await this.upload(input.image);
    const row = must(await this.sb.from('groups').insert({
      name: input.name.trim(), description: input.description.trim(), image, created_by: await this.me(),
      weekly_goal: input.weeklyGoal, rest_weekdays: input.restWeekdays,
    }).select().single()) as Row;
    return toGroup(row);
  }

  async joinGroup(code: string): Promise<Group> {
    const id = must(await this.sb.rpc('join_group', { code })) as string;
    return toGroup(must(await this.sb.from('groups').select('*').eq('id', id).single()) as Row);
  }

  async leaveGroup(groupId: string) {
    must(await this.sb.from('group_members').delete().eq('group_id', groupId).eq('user_id', await this.me()));
  }

  async updateGroup(groupId: string, patch: Partial<Pick<Group, 'name' | 'description' | 'weeklyGoal' | 'restWeekdays'>>) {
    const row: Row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.weeklyGoal !== undefined) row.weekly_goal = patch.weeklyGoal;
    if (patch.restWeekdays !== undefined) row.rest_weekdays = patch.restWeekdays;
    must(await this.sb.from('groups').update(row).eq('id', groupId));
  }

  async updateMembership(groupId: string, patch: Partial<Pick<GroupMember, 'pauseFrom' | 'pauseUntil' | 'pauseReason' | 'shareMetrics'>>) {
    const row: Row = {};
    if (patch.pauseFrom !== undefined) row.pause_from = patch.pauseFrom;
    if (patch.pauseUntil !== undefined) row.pause_until = patch.pauseUntil;
    if (patch.pauseReason !== undefined) row.pause_reason = patch.pauseReason;
    if (patch.shareMetrics !== undefined) row.share_metrics = patch.shareMetrics;
    must(await this.sb.from('group_members').update(row).eq('group_id', groupId).eq('user_id', await this.me()));
  }

  async saveGoal(goal: Goal) {
    const isNew = !/^[0-9a-f-]{36}$/.test(goal.id);
    must(await this.sb.from('goals').upsert({
      ...(isNew ? {} : { id: goal.id }), user_id: await this.me(), title: goal.title, pillar: goal.pillar, target: goal.target,
      frequency: goal.frequency, start_date: goal.startDate, end_date: goal.endDate, checkins: goal.checkins, archived: goal.archived,
    }));
  }

  async deleteGoal(id: string) {
    must(await this.sb.from('goals').delete().eq('id', id));
  }

  async completeLesson(p: LessonProgress) {
    const me = await this.me();
    const prev = must(await this.sb.from('lesson_progress').select('score').eq('lesson_id', p.lessonId).maybeSingle()) as Row | null;
    if (prev) must(await this.sb.from('lesson_progress').update({ score: Math.max(prev.score, p.score) }).eq('lesson_id', p.lessonId).eq('user_id', me));
    else must(await this.sb.from('lesson_progress').insert({ user_id: me, lesson_id: p.lessonId, xp: p.xp, score: p.score }));
  }

  async addJournal(e: JournalEntry) {
    must(await this.sb.from('journal_entries').insert({ user_id: await this.me(), prompt: e.prompt, text: e.text, pillar: e.pillar }));
  }

  async setRestDay(day: string, reason: string | null) {
    const me = await this.me();
    if (reason === null) must(await this.sb.from('rest_days').delete().eq('user_id', me).eq('day', day));
    else must(await this.sb.from('rest_days').upsert({ user_id: me, day, reason }));
  }

  async resolvePhoto(ref: string): Promise<string> {
    const s = resolveStaticRef(ref);
    if (s !== null || !ref) return s ?? '';
    if (!this.urls.has(ref)) {
      const { data } = await this.sb.storage.from('photos').createSignedUrl(ref, 60 * 60);
      if (!data) return '';
      this.urls.set(ref, data.signedUrl);
    }
    return this.urls.get(ref)!;
  }
}
