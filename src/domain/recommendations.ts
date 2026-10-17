// Recomendaciones basadas en reglas sencillas y explicables.
// Tono constructivo: proponen, nunca culpabilizan. No son consejo médico.

import { addDays, dayKey } from './dates';
import { EMOTION_VALENCE } from './emotions';
import { PILLARS, pillar } from './pillars';
import type { GlobalScore } from './scoring';
import type { PillarId, WellnessAction } from './types';

export interface Recommendation {
  id: string;
  text: string;
  pillar?: PillarId;
  tone: 'celebrate' | 'suggest' | 'info';
}

/** Días consecutivos (hasta hoy o ayer) con al menos una acción del pilar. */
export function pillarRun(actions: WellnessAction[], p: PillarId, today: Date): number {
  const days = new Set(actions.filter((a) => a.pillar === p).map((a) => dayKey(a.createdAt)));
  let d = days.has(dayKey(today)) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function recommendations(myActions: WellnessAction[], week: GlobalScore, today: Date): Recommendation[] {
  const out: Recommendation[] = [];
  const worked = week.pillars.filter((p) => p.count > 0).sort((a, b) => b.count - a.count);
  const missing = week.pillars.filter((p) => p.count === 0);

  if (!myActions.length) {
    out.push({ id: 'first', tone: 'suggest', text: 'Empieza con algo pequeño: una foto de tu vaso de agua ya es una acción.' });
    return out;
  }

  for (const p of PILLARS) {
    const run = pillarRun(myActions, p.id, today);
    if (run >= 3) {
      out.push({ id: `run-${p.id}`, tone: 'celebrate', pillar: p.id, text: `Llevas ${run} días seguidos con acciones de ${p.short.toLowerCase()}. ¡Qué constancia!` });
      break;
    }
  }

  if (worked.length) {
    out.push({
      id: 'diversity', tone: 'info',
      text: worked.length === 7
        ? '¡Has explorado los siete pilares esta semana!'
        : `Has explorado ${worked.length} de los siete pilares esta semana.`,
    });
  }

  if (worked.length && missing.length) {
    const top = pillar(worked[0].pillar);
    // Sugiere el pilar menos trabajado, rotando según el día para no repetir siempre el mismo.
    const next = pillar(missing[today.getDate() % missing.length].pillar);
    if (worked[0].count >= 3) {
      out.push({
        id: 'balance', tone: 'suggest', pillar: next.id,
        text: `Esta semana has cuidado mucho tu ${top.name.toLowerCase()}. ¿Qué tal dedicar unos minutos a ${next.name.toLowerCase()}?`,
      });
    } else {
      out.push({
        id: 'explore', tone: 'suggest', pillar: next.id,
        text: `Una idea para hoy: «${next.examples[0]}» suma en ${next.name.toLowerCase()}.`,
      });
    }
  }

  const recent = myActions.filter((a) => a.emotion && new Date(a.createdAt) >= addDays(today, -7));
  if (recent.length >= 3) {
    const avg = recent.reduce((s, a) => s + EMOTION_VALENCE[a.emotion!], 0) / recent.length;
    if (avg >= 3.2) out.push({ id: 'mood-up', tone: 'celebrate', text: 'Esta semana sueles terminar tus acciones con buen ánimo. Sigue escuchándote.' });
    else if (avg <= 1.8) out.push({ id: 'mood-care', tone: 'info', text: 'Parece una semana exigente. Descansar también es cuidarte; si lo necesitas, habla con alguien de confianza.' });
  }

  return out.slice(0, 3);
}
