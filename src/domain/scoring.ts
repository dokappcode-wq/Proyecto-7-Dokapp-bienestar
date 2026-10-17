// Algoritmo de seguimiento transparente.
//
// La puntuación mide participación y constancia en hábitos registrados en Dokapp.
// No diagnostica salud física ni mental: una foto no puede medir el bienestar real.
//
// Puntuación por pilar (0–100) = media ponderada de cuatro componentes (0–1):
//   · Frecuencia  — acciones del pilar / (objetivo semanal × semanas del periodo)
//   · Constancia  — en una semana: días activos / objetivo semanal;
//                   en periodos largos: semanas con al menos una acción / semanas totales
//   · Objetivos   — cumplimiento medio de tus objetivos de ese pilar
//                   (si no tienes objetivos para el pilar, su peso se reparte entre el resto)
//   · Reflexión   — proporción de acciones con descripción o reflexión escrita
//
// Índice global = 80 % media de los siete pilares + 20 % diversidad (pilares trabajados / 7).

import { addDays, dayKey, parseDay } from './dates';
import { PILLARS } from './pillars';
import type { Goal, PillarId, ScoringWeights, WellnessAction } from './types';

export const DEFAULT_WEIGHTS: ScoringWeights = {
  frequency: 40,
  consistency: 30,
  goals: 20,
  reflection: 10,
  weeklyTargetPerPillar: 2,
};

export type PeriodId = 'week' | 'month' | 'quarter' | 'year';

export const PERIODS: { id: PeriodId; label: string; days: number }[] = [
  { id: 'week', label: 'Semana', days: 7 },
  { id: 'month', label: 'Mes', days: 30 },
  { id: 'quarter', label: '90 días', days: 90 },
  { id: 'year', label: 'Año', days: 365 },
];

export interface Period {
  start: string; // día incluido
  end: string; // día incluido
  days: number;
}

export function periodEnding(today: Date, days: number, offsetPeriods = 0): Period {
  const end = addDays(today, -days * offsetPeriods);
  return { start: dayKey(addDays(end, -(days - 1))), end: dayKey(end), days };
}

export const inPeriod = (iso: string, p: Period) => {
  const k = dayKey(iso);
  return k >= p.start && k <= p.end;
};

export interface ScoreBreakdown {
  pillar: PillarId;
  score: number;
  count: number;
  activeDays: number;
  components: { frequency: number; consistency: number; goals: number | null; reflection: number };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Días distintos (dentro del periodo) en los que el objetivo se cumplió por acción o check-in manual. */
export function goalDoneDays(goal: Goal, actions: WellnessAction[], p: Period): Set<string> {
  const days = new Set<string>();
  for (const a of actions) if (a.pillar === goal.pillar && inPeriod(a.createdAt, p)) days.add(dayKey(a.createdAt));
  for (const c of goal.checkins) if (c >= p.start && c <= p.end) days.add(c);
  return days;
}

/** Cumplimiento 0–1 de un objetivo en un periodo, contando solo los días en que estuvo activo. */
export function goalCompletion(goal: Goal, actions: WellnessAction[], p: Period): number | null {
  const start = goal.startDate > p.start ? goal.startDate : p.start;
  const end = goal.endDate && goal.endDate < p.end ? goal.endDate : p.end;
  if (start > end || goal.archived) return null;
  const activeDays = Math.round((parseDay(end).getTime() - parseDay(start).getTime()) / 86400000) + 1;
  const expected = goal.frequency === 'daily' ? goal.target * activeDays : goal.target * (activeDays / 7);
  const done = goalDoneDays(goal, actions, { start, end, days: activeDays }).size;
  return clamp01(done / Math.max(1, expected));
}

export function scorePillar(
  pillarId: PillarId,
  myActions: WellnessAction[],
  goals: Goal[],
  p: Period,
  w: ScoringWeights = DEFAULT_WEIGHTS,
): ScoreBreakdown {
  const acts = myActions.filter((a) => a.pillar === pillarId && inPeriod(a.createdAt, p));
  const weeks = p.days / 7;
  const target = Math.max(1, w.weeklyTargetPerPillar);
  const activeDaySet = new Set(acts.map((a) => dayKey(a.createdAt)));

  const frequency = clamp01(acts.length / (target * weeks));

  let consistency: number;
  if (p.days <= 7) {
    consistency = clamp01(activeDaySet.size / target);
  } else {
    const totalWeeks = Math.ceil(p.days / 7);
    const active = new Set<number>();
    const start = parseDay(p.start).getTime();
    for (const d of activeDaySet) active.add(Math.floor((parseDay(d).getTime() - start) / (7 * 86400000)));
    consistency = active.size / totalWeeks;
  }

  const completions = goals
    .filter((g) => g.pillar === pillarId)
    .map((g) => goalCompletion(g, myActions, p))
    .filter((x): x is number => x !== null);
  const goalsScore = completions.length ? completions.reduce((s, x) => s + x, 0) / completions.length : null;

  const reflection = acts.length
    ? acts.filter((a) => a.description.trim() || a.reflection.trim()).length / acts.length
    : 0;

  let sum = w.frequency * frequency + w.consistency * consistency + w.reflection * reflection;
  let weight = w.frequency + w.consistency + w.reflection;
  if (goalsScore !== null) {
    sum += w.goals * goalsScore;
    weight += w.goals;
  }
  const score = weight > 0 ? Math.round((100 * sum) / weight) : 0;

  return {
    pillar: pillarId,
    score,
    count: acts.length,
    activeDays: activeDaySet.size,
    components: { frequency, consistency, goals: goalsScore, reflection },
  };
}

export interface GlobalScore {
  score: number;
  diversity: number; // pilares trabajados en el periodo
  pillars: ScoreBreakdown[];
}

export function scoreAll(myActions: WellnessAction[], goals: Goal[], p: Period, w: ScoringWeights = DEFAULT_WEIGHTS): GlobalScore {
  const pillars = PILLARS.map((pl) => scorePillar(pl.id, myActions, goals, p, w));
  const mean = pillars.reduce((s, x) => s + x.score, 0) / pillars.length;
  const diversity = pillars.filter((x) => x.count > 0).length;
  return { score: Math.round(0.8 * mean + 0.2 * (100 * diversity) / 7), diversity, pillars };
}
