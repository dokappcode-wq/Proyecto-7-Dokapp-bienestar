// Gamificación del aprendizaje. Los XP son independientes de las métricas de bienestar.

import { LESSONS, lessonsFor } from '../content/lessons';
import { dayKey, shiftDay } from './dates';
import { PILLARS } from './pillars';
import type { LessonProgress, PillarId } from './types';

export const XP_PER_LEVEL = 60;

export function totalXp(progress: LessonProgress[]): number {
  return progress.reduce((s, p) => s + p.xp, 0);
}

export function pillarXp(progress: LessonProgress[], p: PillarId): number {
  return progress.filter((x) => x.lessonId.startsWith(`${p}-`)).reduce((s, x) => s + x.xp, 0);
}

/** Nivel 1 al empezar; sube cada XP_PER_LEVEL puntos. */
export const levelFromXp = (xp: number) => 1 + Math.floor(xp / XP_PER_LEVEL);

export interface PathState {
  pillar: PillarId;
  completed: number;
  total: number;
  nextLessonId: string | null;
  xp: number;
  level: number;
}

export function isCompleted(progress: LessonProgress[], lessonId: string) {
  return progress.some((p) => p.lessonId === lessonId);
}

/** Una lección se desbloquea al completar la anterior del mismo camino. */
export function isUnlocked(progress: LessonProgress[], lessonId: string): boolean {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return false;
  if (lesson.level === 1) return true;
  return isCompleted(progress, `${lesson.pillar}-${lesson.level - 1}`);
}

export function pathState(progress: LessonProgress[], p: PillarId): PathState {
  const lessons = lessonsFor(p);
  const completed = lessons.filter((l) => isCompleted(progress, l.id)).length;
  const next = lessons.find((l) => !isCompleted(progress, l.id));
  const xp = pillarXp(progress, p);
  return { pillar: p, completed, total: lessons.length, nextLessonId: next?.id ?? null, xp, level: levelFromXp(xp) };
}

export const allPaths = (progress: LessonProgress[]) => PILLARS.map((p) => pathState(progress, p.id));

/** Días seguidos aprendiendo. Admite un día de margen sin romperse: aprender no debe ser una obligación. */
export function learningStreak(progress: LessonProgress[], today: Date): number {
  const days = new Set(progress.map((p) => dayKey(p.completedAt)));
  let d = dayKey(today);
  if (!days.has(d)) d = shiftDay(d, -1);
  let n = 0;
  let grace = 1;
  while (true) {
    if (days.has(d)) n++;
    else if (grace-- <= 0 || n === 0) break;
    d = shiftDay(d, -1);
  }
  return n;
}
