import { describe, expect, it } from 'vitest';
import { LocalBackend } from '../src/data/localBackend';
import { DEMO_GROUP_ID } from '../src/data/seed';
import { groupStreak } from '../src/domain/streaks';
import { MemoryKV } from '../src/lib/kv';
import { MemoryPhotoStore } from '../src/lib/photoStore';

const input = (extra = {}) => ({
  photo: 'scene:agua', pillar: 'alimentacion' as const, description: 'Agua', emotion: 'feliz' as const, reflection: 'Me siento bien',
  shareEmotion: false, visibility: 'public' as const, groupIds: [], allowComments: true, originalTakenAt: null, ...extra,
});

async function newUser() {
  const kv = new MemoryKV();
  const b = new LocalBackend(kv, new MemoryPhotoStore());
  await b.signUp('ana@example.com', 'contraseña-segura');
  await b.updateProfile({ name: 'Ana', username: 'ana', onboarded: true, isPublic: true });
  return { b, kv };
}

describe('LocalBackend', () => {
  it('registra, persiste la sesión y valida credenciales', async () => {
    const { b, kv } = await newUser();
    await b.signOut();
    await expect(b.signIn('ana@example.com', 'mala')).rejects.toThrow('incorrectos');
    await b.signIn('ana@example.com', 'contraseña-segura');
    const again = new LocalBackend(kv, new MemoryPhotoStore());
    expect((await again.load()).me.username).toBe('ana');
  });

  it('limita a tres acciones al día', async () => {
    const { b } = await newUser();
    for (let i = 0; i < 3; i++) await b.createAction(input());
    await expect(b.createAction(input())).rejects.toThrow('tres acciones');
  });

  it('mantiene privadas emoción, reflexión y acciones privadas', async () => {
    const { b, kv } = await newUser();
    await b.createAction(input());
    await b.createAction(input({ visibility: 'private', description: 'secreto' }));
    const me = (await b.load()).me.id;
    // Otra persona en el mismo dispositivo que sigue a Ana.
    await b.signOut();
    const other = new LocalBackend(kv, new MemoryPhotoStore());
    await other.signUp('leo@example.com', 'contraseña-segura');
    await other.updateProfile({ name: 'Leo', username: 'leo', onboarded: true });
    await other.follow(me);
    const seen = (await other.load()).actions.filter((a) => a.userId === me);
    expect(seen).toHaveLength(1);
    expect(seen[0].emotion).toBeNull();
    expect(seen[0].reflection).toBe('');
  });

  it('los perfiles privados generan solicitudes que se aceptan', async () => {
    const { b, kv } = await newUser();
    await b.updateProfile({ isPublic: false });
    const anaId = (await b.load()).me.id;
    await b.signOut();
    const leo = new LocalBackend(kv, new MemoryPhotoStore());
    await leo.signUp('leo@example.com', 'contraseña-segura');
    await leo.follow(anaId);
    expect((await leo.load()).follows.find((f) => f.followingId === anaId)?.status).toBe('pending');
    await leo.signOut();
    await b.signIn('ana@example.com', 'contraseña-segura');
    await b.respondFollow((await b.load()).follows.find((f) => f.followingId === anaId)!.followerId, true);
    expect((await b.load()).follows.some((f) => f.followingId === anaId && f.status === 'accepted')).toBe(true);
  });

  it('grupos: unirse por código y borrar la cuenta elimina sus datos', async () => {
    const { b } = await newUser();
    const g = await b.joinGroup('doka-habitos');
    expect(g.id).toBe(DEMO_GROUP_ID);
    await b.createAction(input({ visibility: 'groups', groupIds: [g.id] }));
    expect((await b.load()).groupActivity.some((a) => a.groupId === g.id && a.count > 0)).toBe(true);
    await b.deleteAccount();
    expect(await b.currentUserId()).toBeNull();
    await expect(b.signIn('ana@example.com', 'contraseña-segura')).rejects.toThrow();
  });

  it('la demo reproduce la racha de grupo de las capturas', async () => {
    const demo = new LocalBackend(new MemoryKV(), new MemoryPhotoStore(), { demo: true });
    const s = await demo.load();
    const g = s.groups.find((x) => x.id === DEMO_GROUP_ID)!;
    const st = groupStreak(g, s.members, s.groupActivity, new Date());
    expect(st.current).toBe(12);
    expect(st.today.required).toHaveLength(8);
    expect(st.today.done).toHaveLength(7);
  });
});
