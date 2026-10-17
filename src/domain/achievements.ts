import { dayKey } from './dates';
import { PILLAR_IDS } from './pillars';
import { groupStreak, personalStreak } from './streaks';
import { allPaths } from './learning';
import type { Snapshot } from './types';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: 'spark' | 'flame' | 'camera' | 'star' | 'compass' | 'users' | 'book' | 'turtle';
  unlocked: boolean;
  progress: number; // 0–1
}

export function achievements(s: Snapshot, today: Date): Achievement[] {
  const mine = s.actions.filter((a) => a.userId === s.me.id);
  const streak = personalStreak(mine, s.restDays, today);
  const pillarsExplored = new Set(mine.map((a) => a.pillar)).size;
  const paths = allPaths(s.lessons);
  const pathDone = paths.some((p) => p.completed === p.total);
  const myGroups = s.groups.filter((g) => s.members.some((m) => m.groupId === g.id && m.userId === s.me.id));
  const bestGroup = Math.max(0, ...myGroups.map((g) => groupStreak(g, s.members, s.groupActivity, today).best));
  const activeDays = new Set(mine.map((a) => dayKey(a.createdAt))).size;

  const a = (id: string, title: string, description: string, icon: Achievement['icon'], value: number, goal: number): Achievement => ({
    id, title, description, icon, unlocked: value >= goal, progress: Math.min(1, value / goal),
  });

  return [
    a('first', 'Primera acción', 'Registra tu primera acción de bienestar.', 'camera', mine.length, 1),
    a('streak7', 'Siete días de constancia', 'Alcanza una racha de 7 días.', 'flame', streak.best, 7),
    a('actions30', 'Treinta acciones', 'Registra 30 acciones.', 'star', mine.length, 30),
    a('path', 'Primer pilar completado', 'Completa un camino de aprendizaje.', 'book', pathDone ? 1 : 0, 1),
    a('explorer', 'Siete pilares explorados', 'Registra acciones en los siete pilares.', 'compass', pillarsExplored, PILLAR_IDS.length),
    a('group', 'Primera racha grupal', 'Consigue una racha de grupo de 3 días.', 'users', bestGroup, 3),
    a('days30', 'Un mes cuidándote', 'Registra acciones en 30 días distintos.', 'turtle', activeDays, 30),
    a('learner', 'Mente curiosa', 'Completa 10 lecciones.', 'spark', s.lessons.length, 10),
  ];
}
