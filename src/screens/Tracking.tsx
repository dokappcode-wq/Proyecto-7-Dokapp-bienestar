import { useMemo, useState } from 'react';
import { Bars, Radar, Sparkline } from '../components/charts';
import { Icon } from '../components/Icon';
import { Turtle } from '../components/Turtle';
import { Bar, EmotionFace, Photo, PillarBadge, Ring, Sheet, TopBar } from '../components/ui';
import { lessonById } from '../content/lessons';
import { addDays, dayKey, parseDay, WEEKDAYS_SHORT } from '../domain/dates';
import { EMOTIONS, EMOTION_VALENCE } from '../domain/emotions';
import { pathState } from '../domain/learning';
import { pillar } from '../domain/pillars';
import { pillarRun, recommendations } from '../domain/recommendations';
import { DEFAULT_WEIGHTS, goalCompletion, inPeriod, PERIODS, PeriodId, periodEnding, scoreAll, scorePillar } from '../domain/scoring';
import { personalStreak } from '../domain/streaks';
import type { PillarId, ScoringWeights } from '../domain/types';
import { useApp, useData } from '../state/app';

export function TrackingScreen() {
  const { router, now, run } = useApp();
  const { s, myActions } = useData();
  const today = now();
  const [periodId, setPeriodId] = useState<PeriodId>((router.query.get('periodo') as PeriodId) || 'week');
  const [showHow, setShowHow] = useState(false);
  const [compare, setCompare] = useState(false);
  const days = PERIODS.find((p) => p.id === periodId)!.days;
  const period = periodEnding(today, days);
  const prev = periodEnding(today, days, 1);
  const w = s.settings.weights;

  const score = useMemo(() => scoreAll(myActions, s.goals, period, w), [myActions, s.goals, period.start, w]);
  const prevScore = useMemo(() => scoreAll(myActions, s.goals, prev, w), [myActions, s.goals, prev.start, w]);
  const week = useMemo(() => scoreAll(myActions, s.goals, periodEnding(today, 7), w), [myActions, s.goals, w]);
  const streak = personalStreak(myActions, s.restDays, today);
  const inP = myActions.filter((a) => inPeriod(a.createdAt, period));
  const inPrev = myActions.filter((a) => inPeriod(a.createdAt, prev));
  const activeDays = new Set(inP.map((a) => dayKey(a.createdAt))).size;
  const delta = inPrev.length ? Math.round(((inP.length - inPrev.length) / inPrev.length) * 100) : null;
  const sorted = [...score.pillars].sort((a, b) => b.count - a.count || b.score - a.score);
  const most = sorted[0].count ? sorted[0] : null;
  const least = [...score.pillars].sort((a, b) => a.count - b.count || a.score - b.score)[0];
  const recos = recommendations(myActions, week, today);
  const values = Object.fromEntries(score.pillars.map((p) => [p.pillar, p.score])) as Record<PillarId, number>;
  const prevValues = Object.fromEntries(prevScore.pillars.map((p) => [p.pillar, p.score])) as Record<PillarId, number>;

  // Evolución emocional y actividad: por día (semana/mes) o por semana (90 días/año).
  const buckets = periodId === 'week' ? 7 : periodId === 'month' ? 30 : Math.ceil(days / 7);
  const bucketDays = periodId === 'week' || periodId === 'month' ? 1 : 7;
  const series = Array.from({ length: buckets }, (_, i) => {
    const start = addDays(parseDay(period.start), i * bucketDays);
    const keys = Array.from({ length: bucketDays }, (_, k) => dayKey(addDays(start, k)));
    const acts = inP.filter((a) => keys.includes(dayKey(a.createdAt)));
    const emos = acts.filter((a) => a.emotion);
    return {
      label: periodId === 'week' ? WEEKDAYS_SHORT[(start.getDay() + 6) % 7] : String(start.getDate()),
      count: acts.length,
      mood: emos.length ? emos.reduce((t, a) => t + EMOTION_VALENCE[a.emotion!], 0) / emos.length : null,
    };
  });
  const emoCounts = EMOTIONS.map((e) => ({ e, n: inP.filter((a) => a.emotion === e.id).length }));

  return (
    <div className="screen">
      <TopBar title={<><Icon name="chart" style={{ color: 'var(--sky-deep)' }} /> Seguimiento</>} right={
        <button className="icon-btn" aria-label="¿Cómo se calcula?" onClick={() => setShowHow(true)}><Icon name="info" /></button>
      } />
      <div className="segmented">
        {PERIODS.map((p) => <button key={p.id} className={periodId === p.id ? 'on' : ''} onClick={() => setPeriodId(p.id)}>{p.label}</button>)}
      </div>

      <div className="card row mt" style={{ gap: 14 }}>
        <Ring value={score.score} size={136} stroke={13}>
          <b>{score.score}%</b>
          <span>{periodId === 'week' ? 'de tu objetivo semanal' : 'índice de constancia'}</span>
        </Ring>
        <div className="col grow" style={{ gap: 8 }}>
          <div className="reco" style={{ fontSize: 13 }}>
            <span>
              <b style={{ color: 'var(--sky-deep)' }}>{score.score >= 70 ? '¡Vas muy bien!' : score.score >= 40 ? '¡Buen ritmo!' : 'Cada paso cuenta'}</b><br />
              Has trabajado {score.diversity} de los 7 pilares{periodId === 'week' ? ' esta semana' : ''}.
            </span>
          </div>
          {delta !== null && (
            <span className="small bold" style={{ color: delta >= 0 ? 'var(--ok)' : 'var(--ink-2)' }}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} % acciones vs. periodo anterior
            </span>
          )}
        </div>
      </div>

      <div className="stat-grid mt">
        <div className="stat"><b>{inP.length}</b><span>Acciones {periodId === 'week' ? 'esta semana' : 'en el periodo'}</span></div>
        <div className="stat"><b>{activeDays}<small className="subtle">/{days}</small></b><span>Días activos</span></div>
        <div className="stat"><b style={{ color: 'var(--flame)' }}>🔥 {streak.current}</b><span>Racha actual</span></div>
        <div className="stat"><b>🏅 {streak.best}</b><span>Mejor racha</span></div>
      </div>

      {recos.length > 0 && (
        <>
          <div className="h-section">Para ti</div>
          <div className="col">
            {recos.map((r) => (
              <button key={r.id} className={`reco ${r.tone === 'celebrate' ? 'celebrate-tone' : ''}`} style={{ textAlign: 'left' }} onClick={() => r.pillar && router.navigate(`/seguimiento/pilar/${r.pillar}`)}>
                {r.pillar ? <PillarBadge id={r.pillar} size="sm" /> : <Turtle size={30} animated={false} />}
                <span className="grow">{r.text}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="h-section">
        <span>Tus siete pilares</span>
        <button className="link" onClick={() => setCompare(!compare)}>{compare ? 'Ocultar comparación' : 'Comparar con anterior'}</button>
      </div>
      <div className="card">
        <Radar values={values} compare={compare ? prevValues : undefined} />
        {compare && <p className="subtle center small">Línea discontinua: periodo anterior</p>}
        <div className="col" style={{ gap: 0, marginTop: 6 }}>
          {score.pillars.map((p) => {
            const pl = pillar(p.pillar);
            return (
              <button key={p.pillar} className="pillar-row" onClick={() => router.navigate(`/seguimiento/pilar/${p.pillar}`)}>
                <PillarBadge id={p.pillar} size="sm" />
                <span><span className="name">{pl.name}</span><Bar value={p.score} color={pl.color} height={7} /></span>
                <span className="pct">{p.score}%</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="stat-grid mt">
        <div className="stat">
          <span>Pilar más trabajado</span>
          {most ? <div className="row mt" style={{ marginTop: 6 }}><PillarBadge id={most.pillar} size="sm" /><b style={{ fontSize: 14 }}>{pillar(most.pillar).short}</b></div> : <p className="subtle">—</p>}
        </div>
        <div className="stat">
          <span>Por explorar</span>
          <div className="row" style={{ marginTop: 6 }}><PillarBadge id={least.pillar} size="sm" /><b style={{ fontSize: 14 }}>{pillar(least.pillar).short}</b></div>
        </div>
      </div>

      <div className="h-section">Actividad</div>
      <div className="card">
        <Bars values={series.map((x) => x.count)} labels={series.map((x, i) => (series.length > 12 && i % 5 !== 0 ? '' : x.label))} highlight={periodId === 'week' ? 6 : undefined} />
      </div>

      <div className="h-section">Evolución emocional</div>
      <div className="card">
        <Sparkline points={series.map((x) => x.mood)} min={1} max={4} />
        <div className="row between mt">
          {emoCounts.map(({ e, n }) => (
            <div key={e.id} className="col center" style={{ alignItems: 'center', gap: 2 }}>
              <EmotionFace id={e.id} size={34} />
              <b className="small">{n}</b>
            </div>
          ))}
        </div>
        <p className="subtle small mt">Solo tú ves tus emociones. Es un registro para escucharte, no una evaluación.</p>
      </div>

      <p className="disclaimer">
        La puntuación refleja tu participación y constancia en hábitos registrados en Dokapp. No mide tu salud física o mental ni sustituye
        el consejo profesional. Si atraviesas un momento difícil, busca apoyo en tu entorno o en profesionales sanitarios.
      </p>

      <HowItWorks open={showHow} onClose={() => setShowHow(false)} weights={w} onSave={(nw) => run((b) => b.saveSettings({ ...s.settings, weights: nw }), 'Cálculo actualizado')} />
    </div>
  );
}

function HowItWorks({ open, onClose, weights, onSave }: { open: boolean; onClose: () => void; weights: ScoringWeights; onSave: (w: ScoringWeights) => void }) {
  const [w, setW] = useState(weights);
  const rows: [keyof ScoringWeights, string, string][] = [
    ['frequency', 'Frecuencia', 'Acciones del pilar frente a tu objetivo semanal.'],
    ['consistency', 'Constancia', 'Días (o semanas) distintos con acciones.'],
    ['goals', 'Objetivos', 'Cumplimiento de tus objetivos de ese pilar. Si no tienes, su peso se reparte.'],
    ['reflection', 'Reflexión', 'Acciones con descripción o reflexión escrita.'],
  ];
  return (
    <Sheet open={open} onClose={onClose} title="¿Cómo se calcula?">
      <p className="muted" style={{ fontSize: 14 }}>Cada pilar recibe una puntuación de 0 a 100 combinando cuatro componentes. El índice global es un 80 % la media de los pilares y un 20 % la diversidad (pilares trabajados de 7).</p>
      {rows.map(([k, label, help]) => (
        <div key={k} className="field mt">
          <label className="row between"><span>{label}</span><span>{w[k]} %</span></label>
          <input type="range" min={0} max={60} step={5} value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} />
          <span className="hint">{help}</span>
        </div>
      ))}
      <div className="field mt">
        <label className="row between"><span>Objetivo semanal por pilar</span><span>{w.weeklyTargetPerPillar} acciones</span></label>
        <input type="range" min={1} max={7} value={w.weeklyTargetPerPillar} onChange={(e) => setW({ ...w, weeklyTargetPerPillar: Number(e.target.value) })} />
      </div>
      <div className="row mt-l">
        <button className="btn ghost grow" onClick={() => setW({ ...DEFAULT_WEIGHTS })}>Restablecer</button>
        <button className="btn grow" onClick={() => { onSave(w); onClose(); }}>Guardar</button>
      </div>
    </Sheet>
  );
}

export function PillarDetail({ id }: { id: PillarId }) {
  const { router, now } = useApp();
  const { s, myActions } = useData();
  const today = now();
  const p = pillar(id);
  const month = periodEnding(today, 30);
  const sc = scorePillar(id, myActions, s.goals, month, s.settings.weights);
  const acts = myActions.filter((a) => a.pillar === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const run = pillarRun(myActions, id, today);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const per = periodEnding(today, 7, 7 - i);
    return acts.filter((a) => inPeriod(a.createdAt, per)).length;
  });
  const goals = s.goals.filter((g) => g.pillar === id && !g.archived);
  const path = pathState(s.lessons, id);
  const next = path.nextLessonId ? lessonById(path.nextLessonId) : null;
  const comp = [
    ['Frecuencia', sc.components.frequency],
    ['Constancia', sc.components.consistency],
    ['Objetivos', sc.components.goals],
    ['Reflexión', sc.components.reflection],
  ] as const;

  return (
    <div className="screen no-tabs">
      <TopBar back="/seguimiento" title={p.name} />
      <div className="card row" style={{ gap: 16, background: `linear-gradient(135deg, ${p.soft}, #fff)` }}>
        <Ring value={sc.score} size={120} stroke={12} color={p.color}>
          <b style={{ fontSize: 28 }}>{sc.score}%</b>
          <span>últimos 30 días</span>
        </Ring>
        <div className="col grow" style={{ gap: 6 }}>
          <PillarBadge id={id} size="lg" solid />
          <p style={{ fontSize: 13 }} className="muted">{p.description}</p>
        </div>
      </div>

      <div className="stat-grid mt" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat"><b>{sc.count}</b><span>Acciones</span></div>
        <div className="stat"><b>{sc.activeDays}</b><span>Días activos</span></div>
        <div className="stat"><b>{run}</b><span>Días seguidos</span></div>
      </div>

      <div className="h-section">Desglose de la puntuación</div>
      <div className="card col" style={{ gap: 12 }}>
        {comp.map(([label, v]) => (
          <div key={label}>
            <div className="row between small bold"><span>{label}</span><span>{v === null ? 'sin objetivos' : `${Math.round(v * 100)}%`}</span></div>
            <Bar value={v === null ? 0 : v * 100} color={p.color} />
          </div>
        ))}
      </div>

      <div className="h-section">Últimas 8 semanas</div>
      <div className="card"><Bars values={weeks} labels={weeks.map((_, i) => (i === 7 ? 'Hoy' : `-${7 - i}s`))} color={p.color} highlight={7} /></div>

      {goals.length > 0 && (
        <>
          <div className="h-section">Tus objetivos</div>
          <div className="list">
            {goals.map((g) => {
              const c = goalCompletion(g, myActions, periodEnding(today, 7)) ?? 0;
              return (
                <div key={g.id} className="list-item">
                  <Icon name="target" style={{ color: p.color }} />
                  <div className="grow"><b style={{ fontSize: 14 }}>{g.title}</b><Bar value={c * 100} color={p.color} height={6} /></div>
                  <span className="small bold">{Math.round(c * 100)}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {next && (
        <button className="path-card mt" onClick={() => router.navigate(`/leccion/${next.id}`)}>
          <span className="pillar-badge" style={{ background: p.color, color: '#fff' }}><Icon name="book" size={20} /></span>
          <span className="grow"><span className="subtle">Siguiente lección · Nivel {next.level}</span><br /><b>{next.title}</b></span>
          <Icon name="chevronRight" className="chev" />
        </button>
      )}

      <div className="h-section">Ideas para hoy</div>
      <div className="chips">{p.examples.map((e) => <span key={e} className="chip">{e}</span>)}</div>

      <div className="h-section">Tus fotos</div>
      {acts.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {acts.slice(0, 12).map((a) => <div key={a.id} className="photo-wrap" style={{ aspectRatio: '1', borderRadius: 12 }}><Photo src={a.photo} /></div>)}
        </div>
      ) : (
        <p className="subtle">Aún no hay acciones de este pilar. ¡Prueba una de las ideas!</p>
      )}
    </div>
  );
}
