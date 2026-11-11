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

  it('solo la administración edita el grupo, sus objetivos y sus miembros', async () => {
    const { b, kv } = await newUser();
    const g = await b.createGroup({ name: 'Amigos', description: '', image: 'scene:bosque', weeklyGoal: 20, dailyGoal: 3, restWeekdays: [] });
    await b.updateGroup(g.id, { name: '  Amigos de Doka ', weeklyGoal: 35, dailyGoal: 5, description: 'Nos cuidamos', image: 'scene:meditar', restWeekdays: [0] });
    let s = await b.load();
    let gg = s.groups.find((x) => x.id === g.id)!;
    expect([gg.name, gg.weeklyGoal, gg.dailyGoal, gg.description, gg.image, gg.restWeekdays]).toEqual(['Amigos de Doka', 35, 5, 'Nos cuidamos', 'scene:meditar', [0]]);
    const oldCode = gg.inviteCode;
    const code = await b.newInviteCode(g.id);
    expect(code).not.toBe(oldCode);
    const anaId = s.me.id;

    // Leo se une; no puede editar ni gestionar miembros.
    await b.signOut();
    const leo = new LocalBackend(kv, new MemoryPhotoStore());
    await leo.signUp('leo@example.com', 'contraseña-segura');
    await expect(leo.joinGroup(oldCode)).rejects.toThrow('código');
    await leo.joinGroup(code);
    const leoId = (await leo.load()).me.id;
    await expect(leo.updateGroup(g.id, { dailyGoal: 50 })).rejects.toThrow('administradoras');
    await expect(leo.removeMember(g.id, anaId)).rejects.toThrow('administradoras');

    // Ana lo nombra administrador; ya puede editar. Después Ana lo saca del grupo.
    await leo.signOut();
    await b.signIn('ana@example.com', 'contraseña-segura');
    await b.setMemberRole(g.id, leoId, 'admin');
    await b.signOut();
    await leo.signIn('leo@example.com', 'contraseña-segura');
    await leo.updateGroup(g.id, { dailyGoal: 7 });
    await leo.signOut();
    await b.signIn('ana@example.com', 'contraseña-segura');
    await b.removeMember(g.id, leoId);
    s = await b.load();
    gg = s.groups.find((x) => x.id === g.id)!;
    expect(gg.dailyGoal).toBe(7);
    expect(s.members.filter((m) => m.groupId === g.id).map((m) => m.userId)).toEqual([anaId]);
    // No se puede dejar el grupo sin administración.
    await expect(b.setMemberRole(g.id, anaId, 'member')).rejects.toThrow('al menos una');
  });
});
