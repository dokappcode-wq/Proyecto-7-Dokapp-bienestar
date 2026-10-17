import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { Turtle } from '../components/Turtle';
import { Avatar, Bar, EmotionFace, Empty, Photo, PillarBadge, Sheet, Switch, TopBar } from '../components/ui';
import { addDays, dayKey, formatShortDate, relativeTime, WEEKDAYS } from '../domain/dates';
import { pillar } from '../domain/pillars';
import { groupStreak } from '../domain/streaks';
import type { PillarId, Profile, WellnessAction } from '../domain/types';
import { useApp, useData } from '../state/app';

type Tab = 'feed' | 'personas' | 'grupos';

export function SocialScreen() {
  const { router } = useApp();
  const [tab, setTab] = useState<Tab>((router.query.get('tab') as Tab) || 'feed');
  return (
    <div className="screen">
      <TopBar title={<><Icon name="users" style={{ color: 'var(--sky-deep)' }} /> Social</>} />
      <div className="segmented">
        <button className={tab === 'feed' ? 'on' : ''} onClick={() => setTab('feed')}>Inicio</button>
        <button className={tab === 'personas' ? 'on' : ''} onClick={() => setTab('personas')}>Personas</button>
        <button className={tab === 'grupos' ? 'on' : ''} onClick={() => setTab('grupos')}>Grupos</button>
      </div>
      {tab === 'feed' && <Feed />}
      {tab === 'personas' && <People />}
      {tab === 'grupos' && <Groups />}
    </div>
  );
}

// ---- Feed -------------------------------------------------------------------

function Feed() {
  const { s, me, following, myGroups } = useData();
  const groupIds = new Set(myGroups.map((g) => g.id));
  const posts = s.actions
    .filter((a) => a.userId !== me.id && a.visibility !== 'private' && (following.has(a.userId) || a.groupIds.some((g) => groupIds.has(g))))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 60);
  if (!posts.length) {
    return <Empty pose="wave" title="Tu feed está tranquilo" text="Sigue a personas o únete a un grupo para ver sus pequeñas acciones." />;
  }
  return <div className="col mt" style={{ gap: 16 }}>{posts.map((a) => <Post key={a.id} a={a} />)}</div>;
}

export function Post({ a }: { a: WellnessAction }) {
  const { router, run } = useApp();
  const { s, me, profiles } = useData();
  const author = profiles.get(a.userId);
  const p = pillar(a.pillar);
  const reactions = s.reactions.filter((r) => r.actionId === a.id);
  const mine = reactions.some((r) => r.userId === me.id);
  const comments = s.comments.filter((c) => c.actionId === a.id);
  const [open, setOpen] = useState(false);
  return (
    <article className="post">
      <button className="post-head" style={{ width: '100%', textAlign: 'left' }} onClick={() => router.navigate(a.userId === me.id ? '/perfil' : `/usuario/${a.userId}`)}>
        <Avatar profile={author} size={40} />
        <span className="grow">
          <b style={{ fontSize: 14 }}>{author?.name}</b>
          <span className="subtle" style={{ display: 'block' }}>@{author?.username} · {relativeTime(a.createdAt)}</span>
        </span>
        {a.visibility === 'groups' && <Icon name="users" size={18} style={{ color: 'var(--ink-3)' }} />}
      </button>
      <div className="post-photo">
        <Photo src={a.photo} alt={a.description || p.name} />
        <span className="tag" style={{ color: p.color }}><PillarBadge id={a.pillar} size="sm" /> {p.short}</span>
        {a.emotion && <span className="emo"><EmotionFace id={a.emotion} size={36} /></span>}
      </div>
      <div className="post-body">
        {a.description && <p style={{ fontSize: 14 }}><b>{author?.name.split(' ')[0]}</b> {a.description}</p>}
        {a.originalTakenAt && <p className="subtle small">Foto tomada el {formatShortDate(a.originalTakenAt)}</p>}
        <div className="post-actions">
          <button className={`react-btn ${mine ? 'on' : ''}`} onClick={() => run((b) => b.toggleReaction(a.id))} aria-pressed={mine} aria-label="Dar apoyo">
            <Icon name="heart" size={22} style={mine ? { fill: '#e8657a' } : undefined} /> {reactions.length || ''} <span className="small">Apoyo</span>
          </button>
          {a.allowComments && (
            <button className="react-btn" onClick={() => setOpen(true)} aria-label="Comentarios">
              <Icon name="message" size={21} /> {comments.length || ''}
            </button>
          )}
        </div>
        {comments.slice(-2).map((c) => (
          <p key={c.id} style={{ fontSize: 13 }}><b>{profiles.get(c.userId)?.username ?? 'alguien'}</b> {c.text}</p>
        ))}
      </div>
      <Comments open={open} onClose={() => setOpen(false)} action={a} />
    </article>
  );
}

function Comments({ open, onClose, action }: { open: boolean; onClose: () => void; action: WellnessAction }) {
  const { run } = useApp();
  const { s, me, profiles } = useData();
  const [text, setText] = useState('');
  const list = s.comments.filter((c) => c.actionId === action.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <Sheet open={open} onClose={onClose} title="Comentarios">
      <div className="col">
        {list.length === 0 && <p className="subtle">Sé la primera persona en dejar un mensaje de ánimo.</p>}
        {list.map((c) => (
          <div key={c.id} className="row" style={{ alignItems: 'flex-start' }}>
            <Avatar profile={profiles.get(c.userId)} size={32} />
            <p className="grow" style={{ fontSize: 14 }}><b>{profiles.get(c.userId)?.username}</b> {c.text}<br /><span className="subtle small">{relativeTime(c.createdAt)}</span></p>
            {(c.userId === me.id || action.userId === me.id) && (
              <button className="icon-btn" aria-label="Borrar comentario" onClick={() => run((b) => b.deleteComment(c.id))}><Icon name="trash" size={17} /></button>
            )}
          </div>
        ))}
      </div>
      <form className="row mt" onSubmit={(e) => { e.preventDefault(); run((b) => b.addComment(action.id, text)); setText(''); }}>
        <input className="input grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe algo amable…" maxLength={500} />
        <button className="btn small" disabled={!text.trim()}>Enviar</button>
      </form>
      <p className="hint mt">Dokapp es un espacio positivo: los comentarios ofensivos pueden eliminarse.</p>
    </Sheet>
  );
}

// ---- Personas --------------------------------------------------------------------

function weekActiveDays(actions: WellnessAction[], userId: string, today: Date) {
  const since = dayKey(addDays(today, -6));
  return new Set(actions.filter((a) => a.userId === userId && dayKey(a.createdAt) >= since).map((a) => dayKey(a.createdAt))).size;
}

export function FollowButton({ profile }: { profile: Profile }) {
  const { run } = useApp();
  const { following, pending } = useData();
  if (following.has(profile.id)) return <button className="btn ghost small" onClick={() => run((b) => b.unfollow(profile.id))}>Siguiendo</button>;
  if (pending.has(profile.id)) return <button className="btn soft small" onClick={() => run((b) => b.unfollow(profile.id))}>Solicitado</button>;
  return <button className="btn small" onClick={() => run((b) => b.follow(profile.id), profile.isPublic ? `Ahora sigues a ${profile.name}` : 'Solicitud enviada')}>{profile.isPublic ? 'Seguir' : 'Solicitar'}</button>;
}

function People() {
  const { backend, router, run, now } = useApp();
  const { s, me, following, requests, profiles } = useData();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  useEffect(() => {
    let alive = true;
    backend.searchUsers(q).then((r) => alive && setResults(r));
    return () => {
      alive = false;
    };
  }, [q, backend, s]);
  const today = now();
  const followed = s.profiles.filter((p) => following.has(p.id));
  const suggestions = results.filter((p) => !following.has(p.id) && p.id !== me.id);

  return (
    <div className="mt">
      <div className="row" style={{ background: '#fff', borderRadius: 999, padding: '0 14px', boxShadow: 'var(--shadow)' }}>
        <Icon name="search" size={18} style={{ color: 'var(--ink-3)' }} />
        <input className="input" style={{ border: 0, background: 'transparent' }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o @usuario" aria-label="Buscar personas" />
      </div>

      {requests.length > 0 && (
        <>
          <div className="h-section">Solicitudes de seguimiento</div>
          <div className="list">
            {requests.map((r) => {
              const p = profiles.get(r.followerId);
              return (
                <div key={r.followerId} className="person">
                  <Avatar profile={p} size={44} />
                  <span className="grow"><b>{p?.name}</b><br /><span className="subtle">@{p?.username}</span></span>
                  <button className="btn small" onClick={() => run((b) => b.respondFollow(r.followerId, true))}>Aceptar</button>
                  <button className="icon-btn" aria-label="Rechazar" onClick={() => run((b) => b.respondFollow(r.followerId, false))}><Icon name="close" size={18} /></button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!q && (
        <>
          <div className="h-section">Personas que sigues</div>
          {followed.length ? (
            <div className="list">
              {followed.map((p) => {
                const days = weekActiveDays(s.actions, p.id, today);
                return (
                  <button key={p.id} className="person" style={{ width: '100%', textAlign: 'left' }} onClick={() => router.navigate(`/usuario/${p.id}`)}>
                    <Avatar profile={p} size={46} />
                    <span className="grow col" style={{ gap: 4 }}>
                      <b style={{ fontSize: 14 }}>{p.name}</b>
                      <span className="subtle small">@{p.username} · {days} de 7 días activos</span>
                      <Bar value={(days / 7) * 100} color={['#3FB37F', '#73C9F5', '#8A7CF0'][p.username.length % 3]} height={6} />
                    </span>
                    <Icon name="chevronRight" className="chev" />
                  </button>
                );
              })}
            </div>
          ) : <p className="subtle">Aún no sigues a nadie.</p>}
        </>
      )}

      <div className="h-section">{q ? 'Resultados' : 'Sugerencias'}</div>
      <div className="list">
        {suggestions.slice(0, q ? 30 : 5).map((p) => (
          <div key={p.id} className="person">
            <button onClick={() => router.navigate(`/usuario/${p.id}`)}><Avatar profile={p} size={44} /></button>
            <button className="grow" style={{ textAlign: 'left' }} onClick={() => router.navigate(`/usuario/${p.id}`)}>
              <b style={{ fontSize: 14 }}>{p.name}</b> {!p.isPublic && <Icon name="lock" size={13} style={{ color: 'var(--ink-3)' }} />}<br /><span className="subtle">@{p.username}</span>
            </button>
            <FollowButton profile={p} />
          </div>
        ))}
        {!suggestions.length && <p className="subtle">No hay resultados.</p>}
      </div>
    </div>
  );
}

// ---- Grupos -----------------------------------------------------------------------

function Groups() {
  const { router, run, now } = useApp();
  const { s, myGroups } = useData();
  const [create, setCreate] = useState(false);
  const [join, setJoin] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [goal, setGoal] = useState(20);
  const today = now();

  return (
    <div className="mt">
      <div className="row">
        <button className="btn grow" onClick={() => setCreate(true)}><Icon name="plus" size={18} /> Crear grupo</button>
        <button className="btn ghost grow" onClick={() => setJoin(true)}><Icon name="key" size={18} /> Unirme</button>
      </div>
      <div className="h-section">Tus grupos</div>
      {myGroups.length ? (
        <div className="list">
          {myGroups.map((g) => {
            const st = groupStreak(g, s.members, s.groupActivity, today);
            const count = s.members.filter((m) => m.groupId === g.id).length;
            return (
              <button key={g.id} className="list-item" onClick={() => router.navigate(`/social/grupo/${g.id}`)}>
                <div className="thumb"><Photo src={g.image || 'scene:sendero'} /></div>
                <span className="grow">
                  <b style={{ fontSize: 15 }}>{g.name}</b><br />
                  <span className="subtle">{count} miembros · {st.today.done.length} de {st.today.required.length} hoy</span>
                </span>
                <span className="streak-pill"><Icon name="flame" size={15} /> {st.current}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty pose="wave" title="Aún no tienes grupos" text="Crea uno con tus amistades o únete con un código de invitación. ¿Quieres probar? Usa DOKA-HABITOS." />
      )}

      <Sheet open={create} onClose={() => setCreate(false)} title="Nuevo grupo">
        <div className="col">
          <div className="field"><label htmlFor="gn">Nombre</label><input id="gn" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Amigos de Doka" maxLength={60} /></div>
          <div className="field"><label htmlFor="gd">Descripción</label><input id="gd" className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Nos animamos a cuidarnos cada día" /></div>
          <div className="field"><label>Objetivo común: {goal} acciones por semana</label><input type="range" min={5} max={100} step={5} value={goal} onChange={(e) => setGoal(Number(e.target.value))} /></div>
          <p className="hint">Los grupos son privados: solo se entra con el código de invitación.</p>
          <button className="btn block" disabled={!name.trim()} onClick={async () => {
            const g = await run((b) => b.createGroup({ name, description: desc, image: 'scene:bosque', weeklyGoal: goal, restWeekdays: [] }), 'Grupo creado');
            if (g) {
              setCreate(false);
              setName('');
              setDesc('');
              router.navigate(`/social/grupo/${g.id}`);
            }
          }}>Crear</button>
        </div>
      </Sheet>

      <Sheet open={join} onClose={() => setJoin(false)} title="Unirme a un grupo">
        <div className="col">
          <input className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DOKA-XXXXXX" aria-label="Código de invitación" />
          <button className="btn block" disabled={!code.trim()} onClick={async () => {
            const g = await run((b) => b.joinGroup(code));
            if (g) {
              setJoin(false);
              setCode('');
              router.navigate(`/social/grupo/${g.id}`);
            }
          }}>Unirme</button>
        </div>
      </Sheet>
    </div>
  );
}

export function GroupScreen({ id }: { id: string }) {
  const { router, run, now, toast } = useApp();
  const { s, me, profiles } = useData();
  const [settings, setSettings] = useState(false);
  const g = s.groups.find((x) => x.id === id);
  const today = now();
  if (!g) return <div className="screen no-tabs"><TopBar back="/social?tab=grupos" title="Grupo" /><Empty title="No encontramos este grupo" /></div>;

  const members = s.members.filter((m) => m.groupId === id);
  const myMember = members.find((m) => m.userId === me.id);
  const isAdmin = myMember?.role === 'admin';
  const st = groupStreak(g, s.members, s.groupActivity, today);
  const since = dayKey(addDays(today, -6));
  const act = s.groupActivity.filter((a) => a.groupId === id && a.day >= since);
  const weekTotal = act.reduce((t, a) => t + a.count, 0);
  const pillarCounts = new Map<string, number>();
  for (const a of act) for (const p of a.pillars) pillarCounts.set(p, (pillarCounts.get(p) ?? 0) + 1);
  const pillarTotal = Math.max(1, ...pillarCounts.values());
  const topPillars = [...pillarCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const heatDays = Array.from({ length: 28 }, (_, i) => dayKey(addDays(today, i - 27)));
  const feed = s.actions
    .filter((a) => a.groupIds.includes(id) || (a.visibility === 'public' && members.some((m) => m.userId === a.userId)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12);
  const allTimeTotal = s.groupActivity.filter((a) => a.groupId === id).reduce((t, a) => t + a.count, 0);
  const activeDays = new Set(s.groupActivity.filter((a) => a.groupId === id && a.count > 0).map((a) => a.day)).size;

  return (
    <div className="screen no-tabs">
      <TopBar back="/social?tab=grupos" title="Mi grupo" right={<button className="icon-btn" aria-label="Ajustes del grupo" onClick={() => setSettings(true)}><Icon name="dots" size={26} stroke={3} /></button>} />
      <div className="row" style={{ gap: 14 }}>
        <div className="thumb" style={{ width: 64, height: 64, borderRadius: 18 }}><Photo src={g.image || 'scene:sendero'} /></div>
        <div className="grow">
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>{g.name}</h2>
          <p className="subtle">{members.length} miembros{g.description ? ` · ${g.description}` : ''}</p>
        </div>
      </div>

      <div className="streak-card mt">
        <span style={{ fontSize: 42 }} aria-hidden="true">🔥</span>
        <div className="grow">
          <p className="small bold muted">Racha del grupo</p>
          <span className="big">{st.current} días</span>
        </div>
        <span className="small bold" style={{ color: 'var(--flame)' }}>{st.current >= 3 ? '¡Vamos equipo!' : '¡A por ella!'}</span>
      </div>

      <div className="card mt">
        <p style={{ fontSize: 14, fontWeight: 700 }}>
          {st.today.groupRest ? `Hoy es día de descanso del grupo (${WEEKDAYS[today.getDay()]}).` : `${st.today.done.length} de ${st.today.required.length} miembros han completado su acción de hoy.`}
        </p>
        <div className="row mt" style={{ flexWrap: 'wrap', gap: 10 }}>
          {members.map((m) => {
            const done = st.today.done.includes(m.userId);
            const resting = st.today.resting.includes(m.userId);
            return (
              <button key={m.userId} className="member-dot" title={profiles.get(m.userId)?.name} onClick={() => m.userId !== me.id && router.navigate(`/usuario/${m.userId}`)}>
                <Avatar profile={profiles.get(m.userId)} size={42} />
                {(done || resting) && <span className={`ok ${resting ? 'rest' : ''}`}><Icon name={resting ? 'moon' : 'check'} size={11} stroke={3} /></span>}
              </button>
            );
          })}
        </div>
        {!st.today.complete && !st.today.groupRest && st.today.required.length - st.today.done.length === 1 && (
          <p className="subtle small mt">¡Solo falta una persona! Un mensaje de ánimo puede ayudar 💙</p>
        )}
        <p className="hint mt">La racha se mantiene cuando cada miembro activo registra al menos una acción. Las pausas y los días de descanso no la rompen.</p>
      </div>

      <div className="h-section">Progreso del grupo</div>
      <div className="card col" style={{ gap: 10 }}>
        <div>
          <div className="row between small bold"><span>Objetivo común semanal</span><span>{weekTotal}/{g.weeklyGoal}</span></div>
          <Bar value={(weekTotal / g.weeklyGoal) * 100} color="var(--sky-deep)" height={10} />
        </div>
        {topPillars.map(([p, n]) => (
          <div key={p} className="pillar-row" style={{ padding: 0 }}>
            <PillarBadge id={p as PillarId} size="sm" />
            <span><span className="name">{pillar(p as PillarId).short}</span><Bar value={(n / pillarTotal) * 100} color={pillar(p as PillarId).color} height={7} /></span>
            <span className="pct">{n}</span>
          </div>
        ))}
        {!topPillars.length && <p className="subtle">Aún no hay actividad esta semana.</p>}
      </div>

      <div className="stat-grid mt" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat"><b>{allTimeTotal}</b><span>Acciones totales</span></div>
        <div className="stat"><b>{activeDays}</b><span>Días de actividad</span></div>
        <div className="stat"><b>{st.best}</b><span>Mejor racha</span></div>
      </div>

      <div className="h-section">Calendario colectivo (4 semanas)</div>
      <div className="card">
        <div className="heat">
          {heatDays.map((d) => {
            const ds = d === dayKey(today) ? st.today : null;
            const rows = s.groupActivity.filter((a) => a.groupId === id && a.day === d && a.count > 0);
            const frac = rows.length / Math.max(1, members.length);
            return <i key={d} title={`${d}: ${rows.length}/${members.length}`} style={{ background: frac ? `rgba(58,159,226,${0.2 + frac * 0.8})` : undefined, outline: ds ? '2px solid var(--sky-deep)' : undefined }} />;
          })}
        </div>
        <p className="hint mt">Cuanto más intenso, más miembros activos ese día.</p>
      </div>

      <div className="h-section">Miembros</div>
      <div className="list">
        {members.map((m) => {
          const p = profiles.get(m.userId);
          const n = s.groupActivity.filter((a) => a.groupId === id && a.userId === m.userId && a.day >= since).reduce((t, a) => t + a.count, 0);
          return (
            <div key={m.userId} className="person">
              <Avatar profile={p} size={40} />
              <span className="grow">
                <b style={{ fontSize: 14 }}>{p?.name}{m.userId === me.id ? ' (tú)' : ''}</b>
                <span className="subtle small" style={{ display: 'block' }}>
                  {m.role === 'admin' ? 'Administración · ' : ''}
                  {m.pauseUntil && m.pauseUntil >= dayKey(today) ? `En pausa hasta el ${formatShortDate(m.pauseUntil)}` : m.shareMetrics ? `${n} acciones esta semana` : 'Métricas privadas'}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="h-section">Acciones compartidas</div>
      {feed.length ? <div className="col" style={{ gap: 16 }}>{feed.map((a) => <Post key={a.id} a={a} />)}</div> : <p className="subtle">Todavía no hay acciones compartidas.</p>}

      <Sheet open={settings} onClose={() => setSettings(false)} title="Ajustes del grupo">
        <div className="card tint row between">
          <span><span className="subtle small">Código de invitación</span><br /><b style={{ fontSize: 18, letterSpacing: 1 }}>{g.inviteCode}</b></span>
          <button className="btn small" onClick={() => { navigator.clipboard?.writeText(g.inviteCode).then(() => toast('Código copiado'), () => toast(g.inviteCode)); }}><Icon name="copy" size={16} /> Copiar</button>
        </div>
        {myMember && (
          <>
            <div className="setting">
              <Icon name="chart" style={{ color: 'var(--sky-deep)' }} />
              <div className="grow"><b style={{ fontSize: 14 }}>Compartir mis métricas</b><p className="subtle">El grupo verá cuántas acciones haces. Nunca tus emociones.</p></div>
              <Switch checked={myMember.shareMetrics} onChange={(v) => run((b) => b.updateMembership(id, { shareMetrics: v }))} label="Compartir métricas" />
            </div>
            <div className="setting">
              <Icon name="moon" style={{ color: 'var(--sky-deep)' }} />
              <div className="grow">
                <b style={{ fontSize: 14 }}>Pausa justificada</b>
                <p className="subtle">{myMember.pauseUntil && myMember.pauseUntil >= dayKey(today) ? `Hasta el ${formatShortDate(myMember.pauseUntil)} (${myMember.pauseReason || 'sin motivo'})` : 'No cuentas para la racha mientras dure.'}</p>
              </div>
              {myMember.pauseUntil && myMember.pauseUntil >= dayKey(today) ? (
                <button className="btn soft small" onClick={() => run((b) => b.updateMembership(id, { pauseFrom: null, pauseUntil: null, pauseReason: '' }), 'Pausa terminada')}>Terminar</button>
              ) : (
                <PauseButton onPause={(days, reason) => run((b) => b.updateMembership(id, { pauseFrom: dayKey(today), pauseUntil: dayKey(addDays(today, days - 1)), pauseReason: reason }), 'Pausa activada')} />
              )}
            </div>
          </>
        )}
        {isAdmin && (
          <div className="field mt">
            <label>Días de descanso del grupo</label>
            <div className="chips">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const on = g.restWeekdays.includes(d);
                return <button key={d} className={`chip ${on ? 'on' : ''}`} onClick={() => run((b) => b.updateGroup(id, { restWeekdays: on ? g.restWeekdays.filter((x) => x !== d) : [...g.restWeekdays, d] }))}>{WEEKDAYS[d].slice(0, 3)}</button>;
              })}
            </div>
            <span className="hint">Esos días no cuentan para la racha: descansar también es cuidarse.</span>
          </div>
        )}
        <button className="btn danger block mt-l" onClick={async () => {
          if (!confirm('¿Seguro que quieres salir del grupo?')) return;
          await run((b) => b.leaveGroup(id), 'Has salido del grupo');
          router.navigate('/social?tab=grupos', { replace: true });
        }}>Salir del grupo</button>
      </Sheet>
    </div>
  );
}

function PauseButton({ onPause }: { onPause: (days: number, reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(3);
  const [reason, setReason] = useState('');
  if (!open) return <button className="btn soft small" onClick={() => setOpen(true)}>Pausar</button>;
  return (
    <div className="col" style={{ width: 150 }}>
      <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Duración">
        {[1, 2, 3, 7, 14].map((d) => <option key={d} value={d}>{d} {d === 1 ? 'día' : 'días'}</option>)}
      </select>
      <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" />
      <button className="btn small" onClick={() => { onPause(days, reason); setOpen(false); }}>Confirmar</button>
    </div>
  );
}

export function UserScreen({ id }: { id: string }) {
  const { s, profiles, following, byUser } = useData();
  const { now } = useApp();
  const p = profiles.get(id);
  if (!p) return <div className="screen no-tabs"><TopBar back="/social" title="Perfil" /><Empty title="Este perfil no existe" /></div>;
  const acts = byUser(id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const followers = s.follows.filter((f) => f.followingId === id && f.status === 'accepted').length;
  const followingN = s.follows.filter((f) => f.followerId === id && f.status === 'accepted').length;
  const canSee = p.isPublic || following.has(id);
  const days = weekActiveDays(s.actions, id, now());
  const pillarsShared = new Set(acts.map((a) => a.pillar));
  return (
    <div className="screen no-tabs">
      <TopBar back="/social" title={`@${p.username}`} />
      <div className="profile-head">
        <Avatar profile={p} size={92} />
        <h2 style={{ fontSize: 21, fontWeight: 900 }}>{p.name}</h2>
        {p.bio && <p className="muted">{p.bio}</p>}
        <div className="profile-stats">
          <div><b>{followers}</b><span>Seguidores</span></div>
          <div><b>{followingN}</b><span>Siguiendo</span></div>
          <div><b>{canSee ? acts.length : '—'}</b><span>Acciones</span></div>
          <div><b>{canSee ? `${days}/7` : '—'}</b><span>Esta semana</span></div>
        </div>
        <div className="mt"><FollowButton profile={p} /></div>
      </div>
      {canSee ? (
        <>
          <div className="h-section">Pilares que comparte</div>
          <div className="chips">{[...pillarsShared].map((x) => <span key={x} className="chip"><PillarBadge id={x} size="sm" />{pillar(x).short}</span>)}</div>
          <div className="h-section">Acciones</div>
          {acts.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {acts.slice(0, 30).map((a) => <div key={a.id} className="photo-wrap" style={{ aspectRatio: '1', borderRadius: 12 }}><Photo src={a.photo} alt={a.description} /></div>)}
            </div>
          ) : <p className="subtle">Aún no ha compartido acciones contigo.</p>}
        </>
      ) : (
        <Empty pose="rest" title="Perfil privado" text="Envía una solicitud para ver sus acciones." />
      )}
      <div className="row mt-l" style={{ justifyContent: 'center' }}><Turtle size={40} animated={false} /><span className="subtle small">Sin rankings: cada camino es único.</span></div>
    </div>
  );
}
