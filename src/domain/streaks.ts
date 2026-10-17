// Rachas personales y de grupo. Pensadas para no generar presión:
// el día de hoy nunca rompe una racha mientras siga en curso, y los días de
// descanso o pausas justificadas sirven de puente sin sumar ni romper.

import { dayKey, parseDay, shiftDay } from './dates';
import type { Group, GroupActivity, GroupMember, RestDay, WellnessAction } from './types';

export const MAX_DAILY_ACTIONS = 3;

export function actionsOnDay(actions: WellnessAction[], day: string): WellnessAction[] {
  return actions.filter((a) => dayKey(a.createdAt) === day);
}

export interface StreakInfo {
  current: number;
  best: number;
  todayDone: boolean;
}

/** Racha personal: días con al menos una acción; los días de descanso hacen de puente. */
export function personalStreak(actions: WellnessAction[], restDays: RestDay[], today: Date): StreakInfo {
  const active = new Set(actions.map((a) => dayKey(a.createdAt)));
  const rest = new Set(restDays.map((r) => r.day));
  const todayKey = dayKey(today);
  const todayDone = active.has(todayKey);

  let current = 0;
  let d = todayDone || rest.has(todayKey) ? todayKey : shiftDay(todayKey, -1);
  while (active.has(d) || rest.has(d)) {
    if (active.has(d)) current++;
    d = shiftDay(d, -1);
  }

  let best = 0;
  let run = 0;
  const all = [...active].sort();
  if (all.length) {
    for (let k = all[0]; k <= todayKey; k = shiftDay(k, 1)) {
      if (active.has(k)) best = Math.max(best, ++run);
      else if (!rest.has(k) && k !== todayKey) run = 0;
    }
  }
  return { current, best: Math.max(best, current), todayDone };
}

export function isPaused(m: GroupMember, day: string): boolean {
  return !!m.pauseFrom && !!m.pauseUntil && day >= m.pauseFrom && day <= m.pauseUntil;
}

export interface GroupDayStatus {
  day: string;
  required: string[]; // miembros que cuentan ese día
  done: string[];
  resting: string[];
  complete: boolean;
  groupRest: boolean;
}

export function groupDayStatus(group: Group, members: GroupMember[], activity: GroupActivity[], day: string): GroupDayStatus {
  const ms = members.filter((m) => m.groupId === group.id && dayKey(m.joinedAt) <= day);
  const act = activity.filter((a) => a.groupId === group.id && a.day === day);
  const groupRest = group.restWeekdays.includes(parseDay(day).getDay());
  const resting = ms
    .filter((m) => isPaused(m, day) || act.some((a) => a.userId === m.userId && a.rest && a.count === 0))
    .map((m) => m.userId);
  const required = ms.map((m) => m.userId).filter((u) => !resting.includes(u));
  const done = required.filter((u) => act.some((a) => a.userId === u && a.count > 0));
  return {
    day,
    required,
    done,
    resting,
    groupRest,
    complete: !groupRest && required.length > 0 && done.length === required.length,
  };
}

export interface GroupStreakInfo extends StreakInfo {
  today: GroupDayStatus;
}

/** Racha colectiva: se mantiene si todos los miembros activos registran al menos una acción. */
export function groupStreak(group: Group, members: GroupMember[], activity: GroupActivity[], today: Date): GroupStreakInfo {
  const todayKey = dayKey(today);
  const status = (d: string) => groupDayStatus(group, members, activity, d);
  const bridge = (s: GroupDayStatus) => s.groupRest || s.required.length === 0;
  const todayStatus = status(todayKey);
  const created = dayKey(group.createdAt);

  let current = 0;
  let d = todayStatus.complete || bridge(todayStatus) ? todayKey : shiftDay(todayKey, -1);
  while (d >= created) {
    const s = d === todayKey ? todayStatus : status(d);
    if (s.complete) current++;
    else if (!bridge(s)) break;
    d = shiftDay(d, -1);
  }

  let best = 0;
  let run = 0;
  for (let k = created; k <= todayKey; k = shiftDay(k, 1)) {
    const s = k === todayKey ? todayStatus : status(k);
    if (s.complete) best = Math.max(best, ++run);
    else if (!bridge(s) && k !== todayKey) run = 0;
  }
  return { current, best: Math.max(best, current), todayDone: todayStatus.complete, today: todayStatus };
}
