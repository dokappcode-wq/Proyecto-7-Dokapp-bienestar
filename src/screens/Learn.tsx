import { useEffect, useRef, useState } from 'react';
import { Icon, IconKey } from '../components/Icon';
import { Turtle } from '../components/Turtle';
import { Bar, PillarBadge, PillarGlyph, TopBar } from '../components/ui';
import { READINGS, tipOfDay } from '../content/library';
import { lessonById, lessonsFor, LESSONS, Question, ToolId, XP_PER_LESSON, XP_PERFECT_BONUS } from '../content/lessons';
import { uid } from '../data/backend';
import { allPaths, isCompleted, isUnlocked, learningStreak, levelFromXp, pathState, totalXp, XP_PER_LEVEL } from '../domain/learning';
import { PILLARS, pillar } from '../domain/pillars';
import type { PillarId } from '../domain/types';
import { useApp, useData } from '../state/app';

export function LearnScreen() {
  const { router, now } = useApp();
  const { s } = useData();
  const [tab, setTab] = useState<'todo' | 'lecturas' | 'herramientas'>((router.query.get('tab') as 'todo') || 'todo');
  const xp = totalXp(s.lessons);
  const level = levelFromXp(xp);
  const lstreak = learningStreak(s.lessons, now());
  const paths = allPaths(s.lessons);
  const tip = tipOfDay(now());
  // Reto diario: la siguiente lección del camino menos avanzado.
  const challenge = [...paths].filter((p) => p.nextLessonId).sort((a, b) => a.completed - b.completed)[0];
  const challengeLesson = challenge?.nextLessonId ? lessonById(challenge.nextLessonId) : null;

  return (
    <div className="screen">
      <TopBar title={<><Icon name="book" style={{ color: 'var(--sky-deep)' }} /> Aprende</>} right={<span className="xp-pill"><Icon name="star" size={15} /> {xp} XP</span>} />
      <div className="segmented">
        {(['todo', 'lecturas', 'herramientas'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t === 'todo' ? 'Todo' : t === 'lecturas' ? 'Lecturas' : 'Herramientas'}</button>
        ))}
      </div>

      {tab === 'todo' && (
        <>
          <div className="card row mt" style={{ background: 'linear-gradient(135deg, #EAF7FF, #fff)' }}>
            <Turtle pose="read" size={78} />
            <div className="grow col" style={{ gap: 6 }}>
              <b>Nivel {level} · {lessonsDone(s.lessons.length)}</b>
              <Bar value={((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100} />
              <span className="subtle small">{XP_PER_LEVEL - (xp % XP_PER_LEVEL)} XP para el nivel {level + 1} · {lstreak > 0 ? `🔥 ${lstreak} días aprendiendo` : 'Sin prisa: aprende a tu ritmo'}</span>
            </div>
          </div>

          {challengeLesson && (
            <button className="path-card mt" style={{ background: pillar(challengeLesson.pillar).soft }} onClick={() => router.navigate(`/leccion/${challengeLesson.id}`)}>
              <span className="pillar-badge" style={{ background: '#fff', color: pillar(challengeLesson.pillar).color }}><Icon name="sparkle" /></span>
              <span className="grow"><span className="small bold" style={{ color: pillar(challengeLesson.pillar).color }}>RETO DE HOY · +{XP_PER_LESSON} XP</span><br /><b>{challengeLesson.title}</b><br /><span className="subtle">{pillar(challengeLesson.pillar).name} · {challengeLesson.minutes} min</span></span>
              <Icon name="play" size={18} style={{ color: pillar(challengeLesson.pillar).color }} />
            </button>
          )}

          <div className="h-section">Tus siete caminos</div>
          <div className="list">
            {paths.map((ps) => {
              const p = pillar(ps.pillar);
              return (
                <button key={p.id} className="path-card" onClick={() => router.navigate(`/aprende/${p.id}`)}>
                  <PillarBadge id={p.id} />
                  <span className="grow col" style={{ gap: 4 }}>
                    <span className="row between"><b style={{ fontSize: 14 }}>{p.name}</b><span className="small subtle">Nv. {ps.level}</span></span>
                    <span className="subtle small ellipsis">{p.tagline}</span>
                    <Bar value={(ps.completed / ps.total) * 100} color={p.color} height={6} />
                  </span>
                  <Icon name="chevronRight" className="chev" />
                </button>
              );
            })}
          </div>

          <div className="card tint row mt">
            <PillarBadge id={tip.pillar} size="sm" solid />
            <p style={{ fontSize: 14 }}><b>Consejo del día:</b> {tip.text}</p>
          </div>
        </>
      )}

      {tab === 'lecturas' && (
        <div className="col mt">
          {PILLARS.map((p) => (
            <div key={p.id}>
              <div className="h-section"><span className="row gap-s"><PillarBadge id={p.id} size="sm" />{p.name}</span></div>
              <div className="list">{READINGS[p.id].map((r) => <ReadingItem key={r.title} r={r} color={p.color} />)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'herramientas' && <ToolsList />}
    </div>
  );
}

const lessonsDone = (n: number) => `${n} de ${LESSONS.length} lecciones`;

function ReadingItem({ r, color }: { r: (typeof READINGS)['mental'][number]; color: string }) {
  const body = (
    <>
      <span className="pillar-badge sm" style={{ background: color, color: '#fff' }}><Icon name="book" size={15} /></span>
      <span className="grow">
        <b style={{ fontSize: 14 }}>{r.title}</b>
        <span className="subtle small" style={{ display: 'block' }}>{r.kind} · {r.author}</span>
        <span className="small muted" style={{ display: 'block', marginTop: 2 }}>{r.description}</span>
      </span>
      {r.url && <Icon name="share" size={18} className="chev" />}
    </>
  );
  return r.url ? <a className="list-item" href={r.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none', alignItems: 'flex-start' }}>{body}</a> : <div className="list-item" style={{ alignItems: 'flex-start' }}>{body}</div>;
}

const TOOLS: { id: ToolId | 'diario'; title: string; text: string; icon: IconKey; pillar: PillarId }[] = [
  { id: 'breathing', title: 'Respiración cuadrada', text: 'Inhala 4, mantén 4, exhala 4, mantén 4.', icon: 'wind', pillar: 'mental' },
  { id: 'timer', title: 'Temporizador de calma', text: 'Meditación, foco o estiramientos.', icon: 'clock', pillar: 'espiritual' },
  { id: 'gratitude', title: 'Tres gratitudes', text: 'Anota tres cosas concretas de hoy.', icon: 'heart', pillar: 'emocional' },
  { id: 'senses', title: '5-4-3-2-1', text: 'Ancla tu atención con los sentidos.', icon: 'eye', pillar: 'ecologia' },
  { id: 'diario', title: 'Mi diario', text: 'Tus reflexiones guardadas.', icon: 'pen', pillar: 'mental' },
];

function ToolsList() {
  const { router } = useApp();
  return (
    <div className="list mt">
      {TOOLS.map((t) => (
        <button key={t.id} className="path-card" onClick={() => router.navigate(`/herramienta/${t.id}`)}>
          <span className="pillar-badge" style={{ background: pillar(t.pillar).soft, color: pillar(t.pillar).color }}><Icon name={t.icon} /></span>
          <span className="grow"><b style={{ fontSize: 14 }}>{t.title}</b><br /><span className="subtle">{t.text}</span></span>
          <Icon name="chevronRight" className="chev" />
        </button>
      ))}
    </div>
  );
}

// ---- Camino de un pilar --------------------------------------------------------

export function PathScreen({ id }: { id: PillarId }) {
  const { router } = useApp();
  const { s } = useData();
  const p = pillar(id);
  const st = pathState(s.lessons, id);
  const lessons = lessonsFor(id);
  return (
    <div className="screen no-tabs">
      <TopBar back="/aprende" title={p.name} />
      <div className="card row" style={{ background: p.color, color: '#fff' }}>
        <span className="pillar-badge lg" style={{ background: 'rgba(255,255,255,.25)', color: '#fff' }}><PillarGlyph id={id} size={28} /></span>
        <div className="grow">
          <b style={{ fontSize: 17 }}>Nivel {st.level} · {st.xp} XP</b>
          <p style={{ fontSize: 13, opacity: 0.9 }}>{st.completed} de {st.total} lecciones completadas</p>
        </div>
      </div>
      <div className="path-map">
        {lessons.map((l, i) => {
          const done = isCompleted(s.lessons, l.id);
          const open = isUnlocked(s.lessons, l.id);
          const next = l.id === st.nextLessonId;
          const offset = [0, 60, 80, 30, -40, -70, -20][i % 7];
          return (
            <div key={l.id} className="col" style={{ alignItems: 'center', gap: 0, transform: `translateX(${offset}px)` }}>
              {next && <Turtle size={58} animated={false} className="float" />}
              <button
                className={`node ${open ? '' : 'locked'} ${next ? 'next' : ''}`}
                style={{ background: done ? p.color : open ? p.color : undefined, color: open ? '#fff' : undefined, opacity: done || next ? 1 : open ? 0.85 : 1 }}
                onClick={() => open && router.navigate(`/leccion/${l.id}`)}
                aria-label={`Nivel ${l.level}: ${l.title}${done ? ' (completada)' : open ? '' : ' (bloqueada)'}`}
              >
                {done ? <Icon name="check" size={30} stroke={3} /> : open ? <Icon name={i === lessons.length - 1 ? 'trophy' : 'star'} size={28} /> : <Icon name="lock" size={24} />}
              </button>
              <span className="node-label">Nivel {l.level}<br />{l.title}</span>
            </div>
          );
        })}
      </div>
      <div className="h-section">Lecturas recomendadas</div>
      <div className="list">{READINGS[id].map((r) => <ReadingItem key={r.title} r={r} color={p.color} />)}</div>
    </div>
  );
}

// ---- Lección interactiva ------------------------------------------------------

type Phase = { kind: 'card'; i: number } | { kind: 'q'; i: number } | { kind: 'reflect' } | { kind: 'challenge' } | { kind: 'done' };

export function LessonScreen({ id, demoPhase }: { id: string; demoPhase?: number }) {
  const { router, run, now } = useApp();
  const { s } = useData();
  const lesson = lessonById(id);
  const phases: Phase[] = lesson
    ? [...lesson.cards.map((_, i) => ({ kind: 'card' as const, i })), ...lesson.quiz.map((_, i) => ({ kind: 'q' as const, i })), { kind: 'reflect' }, { kind: 'challenge' }, { kind: 'done' }]
    : [];
  const [idx, setIdx] = useState(demoPhase ?? 0);
  const [answer, setAnswer] = useState<number | null>(demoPhase !== undefined ? 1 : null);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [reflection, setReflection] = useState('');
  const savedRef = useRef(false);
  // Se fija al abrir la lección: al guardarla, los datos se recargan y ya figuraría como completada.
  const [already] = useState(() => (lesson ? isCompleted(s.lessons, lesson.id) : false));

  if (!lesson) return <div className="screen no-tabs"><TopBar back="/aprende" title="Lección no encontrada" /></div>;
  const p = pillar(lesson.pillar);
  const phase = phases[idx];
  const perfect = correct === lesson.quiz.length;
  const xp = already ? 0 : XP_PER_LESSON + (perfect ? XP_PERFECT_BONUS : 0);

  async function advance() {
    if (phase.kind === 'q') {
      if (!checked) {
        const q = lesson!.quiz[phase.i];
        const ok = q.kind === 'choice' ? answer === q.answer : (answer === 1) === q.answer;
        if (ok) setCorrect((c) => c + 1);
        setChecked(true);
        return;
      }
      setChecked(false);
      setAnswer(null);
    }
    if (phase.kind === 'reflect' && reflection.trim()) {
      await run((b) => b.addJournal({ id: uid(), prompt: lesson!.reflection, text: reflection.trim(), pillar: lesson!.pillar, createdAt: now().toISOString() }));
    }
    const nextIdx = idx + 1;
    if (phases[nextIdx]?.kind === 'done' && !savedRef.current) {
      savedRef.current = true;
      await run((b) => b.completeLesson({ lessonId: lesson!.id, completedAt: now().toISOString(), xp, score: lesson!.quiz.length ? correct / lesson!.quiz.length : 1 }));
    }
    setIdx(nextIdx);
  }

  if (phase.kind === 'done') {
    return (
      <div className="celebrate" style={{ position: 'relative', height: '100%' }}>
        <div className="pop"><Turtle pose="celebrate" size={180} /></div>
        <h2>¡Lección completada!</h2>
        <p className="muted">{lesson.title}</p>
        <div className="row" style={{ gap: 10 }}>
          <span className="xp-pill" style={{ fontSize: 16 }}><Icon name="star" size={18} /> +{xp} XP</span>
          <span className="xp-pill" style={{ fontSize: 16, background: '#e9f8f0', color: '#1f7a4f' }}><Icon name="check" size={18} /> {correct}/{lesson.quiz.length}</span>
        </div>
        {already && <p className="subtle">Ya la habías completado: repasar también cuenta.</p>}
        <div className="col" style={{ width: '100%', maxWidth: 300, marginTop: 12 }}>
          <button className="btn block" onClick={() => router.navigate(`/aprende/${lesson.pillar}`, { replace: true })}>Continuar</button>
        </div>
      </div>
    );
  }

  const q: Question | null = phase.kind === 'q' ? lesson.quiz[phase.i] : null;
  const isRight = q && checked && (q.kind === 'choice' ? answer === q.answer : (answer === 1) === q.answer);
  const canContinue = phase.kind !== 'q' || answer !== null;

  return (
    <div className="lesson">
      <div className="lesson-top">
        <button className="icon-btn" aria-label="Salir de la lección" onClick={() => router.back(`/aprende/${lesson.pillar}`)}><Icon name="close" /></button>
        <div className="grow"><Bar value={(idx / (phases.length - 1)) * 100} color={p.color} height={12} /></div>
        <span className="pillar-badge sm" style={{ background: p.soft, color: p.color }}><PillarGlyph id={lesson.pillar} size={15} /></span>
      </div>

      <div className="lesson-body" key={idx}>
        {phase.kind === 'card' && (
          <>
            {phase.i === 0 && <p className="small bold" style={{ color: p.color }}>NIVEL {lesson.level} · {lesson.minutes} MIN</p>}
            <div className="lesson-card">
              <h3>{lesson.cards[phase.i].title}</h3>
              <p>{lesson.cards[phase.i].text}</p>
            </div>
            {phase.i === lesson.cards.length - 1 && lesson.tool && (
              <button className="btn soft" onClick={() => router.navigate(`/herramienta/${lesson.tool}`)}><Icon name="play" size={16} /> Probar la herramienta</button>
            )}
            <div className="row" style={{ alignSelf: 'flex-start' }}><Turtle size={64} pose={phase.i % 2 ? 'read' : 'meditate'} /></div>
          </>
        )}

        {q && (
          <>
            <p className="small bold" style={{ color: p.color }}>{q.kind === 'choice' ? 'ELIGE LA RESPUESTA' : '¿VERDADERO O FALSO?'}</p>
            <h3 style={{ fontSize: 20, fontWeight: 900 }}>{q.prompt}</h3>
            <div className="col">
              {(q.kind === 'choice' ? q.options : ['Falso', 'Verdadero']).map((o, k) => {
                const right = q.kind === 'choice' ? k === q.answer : (k === 1) === q.answer;
                const cls = checked ? (right ? 'right' : k === answer ? 'wrong' : '') : k === answer ? 'sel' : '';
                return <button key={o} className={`answer ${cls}`} disabled={checked} onClick={() => setAnswer(k)}>{o}</button>;
              })}
            </div>
            {checked && (
              <div className={`feedback ${isRight ? 'ok' : 'ko'}`}>
                <b>{isRight ? '¡Correcto!' : 'Casi…'}</b>
                {q.explain}
              </div>
            )}
          </>
        )}

        {phase.kind === 'reflect' && (
          <>
            <p className="small bold" style={{ color: p.color }}>REFLEXIONA</p>
            <h3 style={{ fontSize: 20, fontWeight: 900 }}>{lesson.reflection}</h3>
            <textarea className="textarea" style={{ minHeight: 140 }} value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Escribe con calma. Se guarda en tu diario privado." />
          </>
        )}

        {phase.kind === 'challenge' && (
          <>
            <p className="small bold" style={{ color: p.color }}>TU RETO</p>
            <div className="lesson-card" style={{ background: p.soft }}>
              <h3>Pasa a la acción</h3>
              <p>{lesson.challenge}</p>
            </div>
            <p className="muted">Cuando lo hagas, regístralo con una foto en la cámara de Dokapp.</p>
          </>
        )}
      </div>

      <button className="btn block" disabled={!canContinue} onClick={advance} style={checked ? { background: isRight ? 'var(--ok)' : '#e98a4f' } : undefined}>
        {phase.kind === 'q' && !checked ? 'Comprobar' : phase.kind === 'challenge' ? 'Terminar lección' : 'Continuar'}
      </button>
    </div>
  );
}

// ---- Herramientas ---------------------------------------------------------------

export function ToolScreen({ id }: { id: string }) {
  const tool = TOOLS.find((t) => t.id === id);
  return (
    <div className="screen no-tabs">
      <TopBar back="/aprende?tab=herramientas" title={tool?.title ?? 'Herramienta'} />
      {id === 'breathing' && <Breathing />}
      {id === 'timer' && <Timer />}
      {id === 'gratitude' && <Gratitude />}
      {id === 'senses' && <Senses />}
      {id === 'diario' && <Journal />}
    </div>
  );
}

function Breathing() {
  const PH = ['Inhala', 'Mantén', 'Exhala', 'Mantén'];
  const [on, setOn] = useState(false);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return;
    const h = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(h);
  }, [on]);
  const phase = Math.floor(t / 4) % 4;
  const rounds = Math.floor(t / 16);
  const scale = !on ? 0.8 : phase === 0 ? 1.15 : phase === 1 ? 1.15 : phase === 2 ? 0.8 : 0.8;
  return (
    <div className="col center" style={{ alignItems: 'center' }}>
      <p className="muted">Sigue el círculo. Cuatro tiempos en cada fase.</p>
      <div className="breath-circle" style={{ transform: `scale(${scale})` }}>{on ? `${PH[phase]} · ${4 - (t % 4)}` : 'Listo'}</div>
      <p className="subtle">Rondas completadas: {rounds}</p>
      <button className="btn" onClick={() => { setOn(!on); if (on) setT(0); }}>{on ? 'Parar' : 'Empezar'}</button>
      <p className="disclaimer">Si notas mareo, vuelve a respirar con normalidad.</p>
    </div>
  );
}

function Timer() {
  const [mins, setMins] = useState(5);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (left === null || left <= 0) return;
    const h = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(h);
  }, [left]);
  const done = left === 0;
  return (
    <div className="col center" style={{ alignItems: 'center', gap: 16 }}>
      <Turtle pose={done ? 'celebrate' : left !== null ? 'meditate' : 'rest'} size={150} />
      {left === null ? (
        <>
          <div className="chips" style={{ justifyContent: 'center' }}>
            {[1, 3, 5, 10, 15, 25].map((m) => <button key={m} className={`chip ${m === mins ? 'on' : ''}`} onClick={() => setMins(m)}>{m} min</button>)}
          </div>
          <button className="btn" onClick={() => setLeft(mins * 60)}>Empezar</button>
        </>
      ) : done ? (
        <>
          <h2 style={{ fontWeight: 900 }}>¡Tiempo cumplido!</h2>
          <button className="btn" onClick={() => setLeft(null)}>Otra vez</button>
        </>
      ) : (
        <>
          <b style={{ fontSize: 48, fontWeight: 900, color: 'var(--sky-deep)' }}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</b>
          <button className="btn ghost" onClick={() => setLeft(null)}>Cancelar</button>
        </>
      )}
    </div>
  );
}

function Gratitude() {
  const { run, now } = useApp();
  const [items, setItems] = useState(['', '', '']);
  const ok = items.every((x) => x.trim());
  return (
    <div className="col">
      <p className="muted">Tres cosas concretas por las que hoy das las gracias.</p>
      {items.map((v, i) => (
        <input key={i} className="input" value={v} placeholder={`${i + 1}. …`} onChange={(e) => setItems(items.map((x, k) => (k === i ? e.target.value : x)))} />
      ))}
      <button className="btn block" disabled={!ok} onClick={async () => {
        await run((b) => b.addJournal({ id: uid(), prompt: 'Tres gratitudes', text: items.map((x, i) => `${i + 1}. ${x.trim()}`).join('\n'), pillar: 'espiritual', createdAt: now().toISOString() }), 'Guardado en tu diario');
        setItems(['', '', '']);
      }}>Guardar en mi diario</button>
    </div>
  );
}

function Senses() {
  const steps = ['5 cosas que ves', '4 cosas que puedes tocar', '3 cosas que oyes', '2 cosas que hueles', '1 cosa que agradeces'];
  const [i, setI] = useState(0);
  return (
    <div className="col center" style={{ alignItems: 'center', gap: 16 }}>
      <Turtle size={130} />
      <div className="lesson-card" style={{ width: '100%' }}><h3>{i < steps.length ? `Nombra ${steps[i]}` : '¡Bien hecho!'}</h3><p className="muted">{i < steps.length ? 'Tómate tu tiempo. Dilo en voz baja o mentalmente.' : 'Has vuelto al presente.'}</p></div>
      <div className="dots">{steps.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
      <button className="btn" onClick={() => setI(i < steps.length ? i + 1 : 0)}>{i < steps.length ? 'Siguiente' : 'Repetir'}</button>
    </div>
  );
}

function Journal() {
  const { s } = useData();
  const entries = [...s.journal].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!entries.length) return <p className="muted center mt">Tu diario está vacío. Las reflexiones de las lecciones aparecerán aquí.</p>;
  return (
    <div className="list">
      {entries.map((e) => (
        <div key={e.id} className="card">
          <div className="row between"><span className="small bold" style={{ color: pillar(e.pillar).color }}>{pillar(e.pillar).short.toUpperCase()}</span><span className="subtle small">{new Date(e.createdAt).toLocaleDateString('es-ES')}</span></div>
          <p className="muted small mt" style={{ marginTop: 6 }}>{e.prompt}</p>
          <p style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{e.text}</p>
        </div>
      ))}
    </div>
  );
}
