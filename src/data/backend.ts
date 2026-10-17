import type {
  Goal, Group, GroupMember, JournalEntry, LessonProgress, NewActionInput, Profile, Settings, Snapshot, WellnessAction,
} from '../domain/types';

export class BackendError extends Error {}

export interface NewGroupInput {
  name: string;
  description: string;
  image: string | Blob;
  weeklyGoal: number;
  restWeekdays: number[];
}

/**
 * Contrato común de persistencia. Hay dos implementaciones:
 *  · LocalBackend    — datos en el dispositivo (localStorage + IndexedDB); también el modo demo en memoria.
 *  · SupabaseBackend — autenticación, Postgres con RLS y Storage.
 * La interfaz trabaja siempre en nombre de la persona con sesión iniciada.
 */
export interface Backend {
  readonly kind: 'local' | 'demo' | 'supabase';
  currentUserId(): Promise<string | null>;
  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;

  load(): Promise<Snapshot>;

  isUsernameAvailable(username: string): Promise<boolean>;
  updateProfile(patch: Partial<Omit<Profile, 'id' | 'createdAt'>> & { avatarBlob?: Blob }): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;

  createAction(input: NewActionInput): Promise<WellnessAction>;
  deleteAction(id: string): Promise<void>;

  searchUsers(query: string): Promise<Profile[]>;
  follow(userId: string): Promise<void>;
  unfollow(userId: string): Promise<void>;
  respondFollow(followerId: string, accept: boolean): Promise<void>;
  toggleReaction(actionId: string): Promise<void>;
  addComment(actionId: string, text: string): Promise<void>;
  deleteComment(id: string): Promise<void>;

  createGroup(input: NewGroupInput): Promise<Group>;
  joinGroup(inviteCode: string): Promise<Group>;
  leaveGroup(groupId: string): Promise<void>;
  updateGroup(groupId: string, patch: Partial<Pick<Group, 'name' | 'description' | 'weeklyGoal' | 'restWeekdays'>>): Promise<void>;
  updateMembership(groupId: string, patch: Partial<Pick<GroupMember, 'pauseFrom' | 'pauseUntil' | 'pauseReason' | 'shareMetrics'>>): Promise<void>;

  saveGoal(goal: Goal): Promise<void>;
  deleteGoal(id: string): Promise<void>;

  completeLesson(progress: LessonProgress): Promise<void>;
  addJournal(entry: JournalEntry): Promise<void>;
  setRestDay(day: string, reason: string | null): Promise<void>;

  /** Convierte una referencia de foto ("idb:", "scene:", "avatar:", url) en algo que <img> pueda mostrar. */
  resolvePhoto(ref: string): Promise<string>;
}

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

export function inviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `DOKA-${s}`;
}
