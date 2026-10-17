// Backend del servidor propio de Dokapp (server/index.mjs): cuentas, fotos y datos compartidos entre dispositivos.

import { dayKey } from '../domain/dates';
import type {
  Goal, Group, GroupMember, JournalEntry, LessonProgress, NewActionInput, Profile, Settings, Snapshot, WellnessAction,
} from '../domain/types';
import { resolveStaticRef } from '../lib/scenes';
import { Backend, BackendError, NewGroupInput } from './backend';
import { defaultSettings } from './seed';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: 'same-origin', ...init });
  } catch {
    throw new BackendError('Sin conexión. Comprueba tu internet e inténtalo de nuevo.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new BackendError(data.error ?? 'Algo no ha ido bien. Inténtalo de nuevo.');
  return data as T;
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export class ApiBackend implements Backend {
  readonly kind = 'api' as const;

  private async call<T = void>(method: string, ...args: unknown[]): Promise<T> {
    return (await post<{ result: T }>(`/api/rpc/${method}`, { args })).result;
  }

  private async upload(blob: Blob): Promise<string> {
    const { ref } = await request<{ ref: string }>('/api/photos', {
      method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg' }, body: blob,
    });
    return ref;
  }

  async currentUserId() {
    return (await request<{ userId: string | null }>('/api/auth/me')).userId;
  }
  async signUp(email: string, password: string) {
    await post('/api/auth/signup', { email, password });
  }
  async signIn(email: string, password: string) {
    await post('/api/auth/login', { email, password });
  }
  async signOut() {
    await post('/api/auth/logout', {});
  }
  async deleteAccount() {
    await this.call('deleteAccount');
  }

  async load(): Promise<Snapshot> {
    const s = await this.call<Omit<Snapshot, 'settings'> & { settings: Settings | null }>('load');
    return { ...s, settings: s.settings ?? defaultSettings() };
  }

  isUsernameAvailable(username: string) {
    return this.call<boolean>('isUsernameAvailable', username);
  }
  async updateProfile(patch: Partial<Profile> & { avatarBlob?: Blob }) {
    const { avatarBlob, ...rest } = patch;
    if (avatarBlob) rest.avatar = await this.upload(avatarBlob);
    await this.call('updateProfile', rest);
  }
  saveSettings(settings: Settings) {
    return this.call('saveSettings', settings);
  }

  async createAction(input: NewActionInput): Promise<WellnessAction> {
    const photo = typeof input.photo === 'string' ? input.photo : await this.upload(input.photo);
    return this.call<WellnessAction>('createAction', { ...input, photo, localDay: dayKey(new Date()) });
  }
  deleteAction(id: string) {
    return this.call('deleteAction', id);
  }

  searchUsers(query: string) {
    return this.call<Profile[]>('searchUsers', query);
  }
  follow(userId: string) {
    return this.call('follow', userId);
  }
  unfollow(userId: string) {
    return this.call('unfollow', userId);
  }
  respondFollow(followerId: string, accept: boolean) {
    return this.call('respondFollow', followerId, accept);
  }
  toggleReaction(actionId: string) {
    return this.call('toggleReaction', actionId);
  }
  addComment(actionId: string, text: string) {
    return this.call('addComment', actionId, text);
  }
  deleteComment(id: string) {
    return this.call('deleteComment', id);
  }

  async createGroup(input: NewGroupInput): Promise<Group> {
    const image = typeof input.image === 'string' ? input.image : await this.upload(input.image);
    return this.call<Group>('createGroup', { ...input, image });
  }
  joinGroup(code: string) {
    return this.call<Group>('joinGroup', code);
  }
  leaveGroup(groupId: string) {
    return this.call('leaveGroup', groupId);
  }
  updateGroup(groupId: string, patch: Partial<Pick<Group, 'name' | 'description' | 'weeklyGoal' | 'restWeekdays'>>) {
    return this.call('updateGroup', groupId, patch);
  }
  updateMembership(groupId: string, patch: Partial<Pick<GroupMember, 'pauseFrom' | 'pauseUntil' | 'pauseReason' | 'shareMetrics'>>) {
    return this.call('updateMembership', groupId, patch);
  }

  saveGoal(goal: Goal) {
    return this.call('saveGoal', goal);
  }
  deleteGoal(id: string) {
    return this.call('deleteGoal', id);
  }
  completeLesson(progress: LessonProgress) {
    return this.call('completeLesson', progress);
  }
  addJournal(entry: JournalEntry) {
    return this.call('addJournal', entry);
  }
  setRestDay(day: string, reason: string | null) {
    return this.call('setRestDay', day, reason);
  }

  async resolvePhoto(ref: string): Promise<string> {
    const s = resolveStaticRef(ref);
    if (s !== null) return s;
    return ref.startsWith('api:') ? `/api/photos/${ref.slice(4)}` : '';
  }
}
