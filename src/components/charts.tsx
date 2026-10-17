import { useState } from 'react';
import { MONTHS, WEEKDAYS_SHORT, dayKey, startOfWeek, addDays } from '../domain/dates';
import { PILLARS, pillar } from '../domain/pillars';
import type { PillarId, RestDay, WellnessAction } from '../domain/types';
import { Icon } from './Icon';
import { PillarGlyph } from './ui';

/** Gráfico radar de siete ejes, uno por pilar. Valores 0–100. */
export function Radar({ values, compare, size = 300 }: { values: Record<PillarId, number>; compare?: Record<PillarId, number>; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 42;
  const pt = (i: number, v: number) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / PILLARS.length;
    return [cx + Math.cos(ang) * R * (v / 100), cy + Math.sin(ang) * R * (v / 100)];
  };
  const poly = (vals: Record<PillarId, number>) => PILLARS.map((p, i) => pt(i, Math.max(4, vals[p.id])).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto' }} role="img" aria-label="Gráfico de los siete pilares">
      {[25, 50, 75, 100].map((lv) => (
        <polygon key={lv} points={PILLARS.map((_, i) => pt(i, lv).join(',')).join(' ')} fill={lv === 100 ? '#F4FAFE' : 'none'} stroke="#DCEBF5" strokeWidth="1.2" />
      ))}
      {PILLARS.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#DCEBF5" strokeWidth="1.2" />;
      })}
      {compare && <polygon points={poly(compare)} fill="none" stroke="#B9C7D3" strokeWidth="2" strokeDasharray="5 5" />}
      <polygon points={poly(values)} fill="rgba(115,201,245,.32)" stroke="#3A9FE2" strokeWidth="2.5" strokeLinejoin="round" style={{ transition: 'all .6s' }} />
      {PILLARS.map((p, i) => {
        const [x, y] = pt(i, Math.max(4, values[p.id]));
        return <circle key={p.id} cx={x} cy={y} r="4.5" fill={p.color} stroke="#fff" strokeWidth="2" />;
      })}
      {PILLARS.map((p, i) => {
        const [x, y] = pt(i, 128);
        return (
          <g key={p.id} transform={`translate(${x - 15} ${y - 15})`}>
            <circle cx="15" cy="15" r="15" fill={p.soft} />
            <g transform="translate(5 5)" style={{ color: p.color }}><PillarGlyph id={p.id} size={20} /></g>
          </g>
        );
      })}
    </svg>
  );
}

/** Línea suave para series cortas (evolución emocional, actividad). */
export function Sparkline({ points, height = 70, color = '#3A9FE2', min = 0, max = 4 }: { points: (number | null)[]; height?: number; color?: string; min?: number; max?: number }) {
  const w = 300;
  const n = points.length;
  const xy = points.map((v, i) => (v === null ? null : [(i / Math.max(1, n - 1)) * (w - 16) + 8, height - 8 - ((v - min) / (max - min)) * (height - 16)]));
  const valid = xy.filter(Boolean) as number[][];
  const d = valid.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <path d={`M8 ${height - 8} H${w - 8}`} stroke="#E6EEF4" strokeWidth="1.5" />
      {valid.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {valid.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke={color} strokeWidth="2.5" />)}
    </svg>
  );
}

export function Bars({ values, labels, color = 'var(--sky)', highlight }: { values: number[]; labels: string[]; color?: string; highlight?: number }) {
  const max = Math.max(1, ...values);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${values.length}, 1fr)`, gap: 6, alignItems: 'end', height: 110 }}>
      {values.map((v, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
          <span className="small bold" style={{ color: 'var(--ink-2)' }}>{v || ''}</span>
          <div style={{ width: '70%', height: `${(v / max) * 70}%`, minHeight: 4, borderRadius: 8, background: i === highlight ? 'var(--sky-deep)' : color, opacity: v ? 1 : 0.25 }} />
          <span className="small subtle">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

/** Calendario mensual con puntos de color por pilar. */
export function MonthCalendar({ actions, restDays = [], selected, onSelect, today }: {
  actions: WellnessAction[]; restDays?: RestDay[]; selected?: string; onSelect?: (day: string) => void; today: Date;
}) {
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const first = startOfWeek(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const visibleDays = days[35].getMonth() !== month.getMonth() ? days.slice(0, 35) : days;
  const byDay = new Map<string, PillarId[]>();
  for (const a of actions) {
    const k = dayKey(a.createdAt);
    const arr = byDay.get(k) ?? [];
    arr.push(a.pillar);
    byDay.set(k, arr);
  }
  const rest = new Set(restDays.map((r) => r.day));
  const todayKey = dayKey(today);
  return (
    <div>
      <div className="cal-head">
        <button className="icon-btn" aria-label="Mes anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Icon name="chevronLeft" /></button>
        <b>{MONTHS[month.getMonth()]} {month.getFullYear()}</b>
        <button className="icon-btn" aria-label="Mes siguiente" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Icon name="chevronRight" /></button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS_SHORT.map((w) => <span key={w} className="wd">{w}</span>)}
        {visibleDays.map((d) => {
          const k = dayKey(d);
          const ps = byDay.get(k) ?? [];
          const cls = ['cal-day', d.getMonth() !== month.getMonth() && 'out', k === todayKey && 'today', k === selected && 'sel', rest.has(k) && !ps.length && 'rest'].filter(Boolean).join(' ');
          return (
            <button key={k} className={cls} onClick={() => onSelect?.(k)} aria-label={`${d.getDate()} de ${MONTHS[d.getMonth()]}: ${ps.length} acciones`}>
              {d.getDate()}
              <span className="cal-dots">
                {ps.slice(0, 3).map((p, i) => <i key={i} style={{ background: k === selected ? '#fff' : pillar(p).color }} />)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
