import { describe, expect, it } from 'vitest';
import { addDays, dayKey } from '../src/domain/dates';
import { learningStreak } from '../src/domain/learning';
import { recommendations } from '../src/domain/recommendations';
import { DEFAULT_WEIGHTS, goalCompletion, periodEnding, scoreAll, scorePillar } from '../src/domain/scoring';
import { groupStreak, personalStreak } from '../src/domain/streaks';
import type { Goal, Group, GroupActivity, GroupMember, PillarId, WellnessAction } from '../src/domain/types';

const TODAY = new Date(2026, 9, 17, 18, 0); // sábado

function act(daysAgo: number, pillar: PillarId = 'fisica', extra: Partial<WellnessAction> = {}): WellnessAction {
  const d = addDays(TODAY, -daysAgo);
  d.setHours(10, 0, 0, 0);
  return {
    id: `${daysAgo}-${pillar}-${Math.random()}`, userId: 'me', photo: 'scene:correr', pillar, description: '', emotion: null,
    reflection: '', shareEmotion: false, visibility: 'private', groupIds: [], allowComments: true, createdAt: d.toISOString(), originalTakenAt: null, ...extra,
  };
}

describe('puntuación por pilar', () => {
  it('vale 0 sin acciones y nunca supera 100', () => {
    const week = periodEnding(TODAY, 7);
    expect(scorePillar('fisica', [], [], week).score).toBe(0);
    const lots = Array.from({ length: 21 }, (_, i) => act(i % 7, 'fisica', { description: 'x' }));
    expect(scorePillar('fisica', lots, [], week).score).toBe(100);
  });

  it('pondera frecuencia, constancia y reflexión y reparte el peso de objetivos si no hay', () => {
    const week = periodEnding(TODAY, 7);
    // 1 acción con descripción: frecuencia 1/2, constancia 1/2, reflexión 1 → (40·.5 + 30·.5 + 10·1) / 80
    const s = scorePillar('fisica', [act(0, 'fisica', { description: 'Correr' })], [], week);
    expect(s.components.goals).toBeNull();
    expect(s.score).toBe(Math.round((100 * (20 + 15 + 10)) / 80));
  });

  it('incluye el cumplimiento de objetivos cuando existen', () => {
    const week = periodEnding(TODAY, 7);
    const goal: Goal = { id: 'g', userId: 'me', title: 'Correr', pillar: 'fisica', target: 2, frequency: 'weekly', startDate: dayKey(addDays(TODAY, -30)), endDate: null, checkins: [], archived: false };
    const acts = [act(0), act(1)];
    expect(goalCompletion(goal, acts, week)).toBe(1);
    expect(scorePillar('fisica', acts, [goal], week).components.goals).toBe(1);
  });

  it('el índice global premia la diversidad', () => {
    const week = periodEnding(TODAY, 7);
    const one = scoreAll([act(0, 'fisica'), act(1, 'fisica')], [], week);
    const two = scoreAll([act(0, 'fisica'), act(1, 'mental')], [], week);
    expect(two.diversity).toBe(2);
    expect(two.score).toBeGreaterThan(one.score);
  });
});

describe('racha personal', () => {
  it('hoy pendiente no rompe la racha y los descansos hacen de puente', () => {
    const acts = [act(1), act(2), act(4)];
    const s = personalStreak(acts, [{ day: dayKey(addDays(TODAY, -3)), reason: 'descanso' }], TODAY);
    expect(s.current).toBe(3);
    expect(s.todayDone).toBe(false);
    expect(personalStreak(acts, [], TODAY).current).toBe(2);
    expect(personalStreak([...acts, act(0)], [], TODAY).current).toBe(3);
  });
});

describe('racha de grupo', () => {
  const group: Group = { id: 'g', name: 'G', description: '', image: '', inviteCode: 'X', createdBy: 'a', createdAt: addDays(TODAY, -20).toISOString(), weeklyGoal: 10, restWeekdays: [] };
  const member = (userId: string): GroupMember => ({ groupId: 'g', userId, role: 'member', joinedAt: group.createdAt, pauseFrom: null, pauseUntil: null, pauseReason: '', shareMetrics: true });
  const row = (userId: string, daysAgo: number, count = 1, rest = false): GroupActivity => ({ groupId: 'g', userId, day: dayKey(addDays(TODAY, -daysAgo)), count, pillars: ['fisica'], rest });

  it('requiere a todos los miembros activos', () => {
    const acts = [1, 2, 3].flatMap((d) => [row('a', d), row('b', d)]).filter((r) => !(r.userId === 'b' && r.day === dayKey(addDays(TODAY, -3))));
    const s = groupStreak(group, [member('a'), member('b')], acts, TODAY);
    expect(s.current).toBe(2);
    expect(s.today.done).toEqual([]);
  });

  it('las pausas y los días de descanso no la rompen', () => {
    const b = { ...member('b'), pauseFrom: dayKey(addDays(TODAY, -3)), pauseUntil: dayKey(addDays(TODAY, -3)) };
    const acts = [row('a', 1), row('b', 1), row('a', 2), row('b', 2, 0, true), row('a', 3), row('a', 4), row('b', 4)];
    expect(groupStreak(group, [member('a'), b], acts, TODAY).current).toBe(4);
  });

  it('los días de descanso del grupo hacen de puente', () => {
    const g = { ...group, restWeekdays: [addDays(TODAY, -2).getDay()] };
    const acts = [row('a', 1), row('a', 3)];
    expect(groupStreak(g, [member('a')], acts, TODAY).current).toBe(2);
  });
});

describe('recomendaciones y aprendizaje', () => {
  it('nunca culpabilizan y sugieren un pilar sin trabajar', () => {
    const acts = [act(0, 'fisica'), act(1, 'fisica'), act(2, 'fisica'), act(3, 'fisica')];
    const r = recommendations(acts, scoreAll(acts, [], periodEnding(TODAY, 7), DEFAULT_WEIGHTS), TODAY);
    expect(r.some((x) => x.tone === 'suggest' && x.pillar && x.pillar !== 'fisica')).toBe(true);
    for (const x of r) expect(x.text).not.toMatch(/deberías|mal|fallado/i);
  });

  it('la racha de aprendizaje tolera un día de margen', () => {
    const p = (d: number) => ({ lessonId: `mental-${d}`, xp: 20, score: 1, completedAt: addDays(TODAY, -d).toISOString() });
    expect(learningStreak([p(0), p(1), p(3)], TODAY)).toBe(3);
  });
});
