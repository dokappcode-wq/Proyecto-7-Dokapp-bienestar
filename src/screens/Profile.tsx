import { useRef, useState } from 'react';
import { MonthCalendar } from '../components/charts';
import { Icon, IconKey } from '../components/Icon';
import { Turtle } from '../components/Turtle';
import { Avatar, Bar, EmotionFace, Photo, PillarBadge, Sheet, Switch, TopBar } from '../components/ui';
import { uid } from '../data/backend';
import { achievements } from '../domain/achievements';
import { addDays, dayKey, formatShortDate, formatTime, MONTHS, parseDay, startOfWeek, WEEKDAYS, WEEKDAYS_SHORT } from '../domain/dates';
import { emotion } from '../domain/emotions';
import { PILLARS, pillar } from '../domain/pillars';
import { goalCompletion, goalDoneDays, periodEnding } from '../domain/scoring';
import { personalStreak } from '../domain/streaks';
import type { Goal, PillarId } from '../domain/types';
import { compressImage } from '../lib/image';
import { useApp, useData } from '../state/app';

export function ProfileScreen() {
  const { router, now } = useApp();
  const { s, me, myActions, following, followers } = useData();
  const today = now();
  const streak = personalStreak(myActions, s.restDays, today);
  const badges = achievements(s, today);
  const goals = s.goals.filter((g) => !g.archived);
  const week = periodEnding(today, 7);
  const goalsMet = goals.filter((g) => (goalCompletion(g, myActions, week) ?? 0) >= 1).length;
  const monday = startOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => dayKey(addDays(monday, i)));
  const recent = [...myActions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 9);

  return (
    <div className="screen">
      <TopBar title="" right={
        <div className="row" style={{ gap: 0 }}>
          <button className="icon-btn" aria-label="Editar perfil" onClick={() => router.navigate('/perfil/editar')}><Icon name="edit" /></button>
          <button className="icon-btn" aria-label="Ajustes" onClick={() => router.navigate('/ajustes')}><Icon name="settings" /></button>
        </div>
      } />
      <div className="profile-head" style={{ marginTop: -36 }}>
        <Avatar profile={me} size={104} />
        <h2 style={{ fontSize: 23, fontWeight: 900 }}>{me.name || me.username}</h2>
        <p className="subtle">@{me.username} {me.isPublic ? '' : '· 🔒 Privado'}</p>
        {me.bio && <p className="muted" style={{ fontSize: 14 }}>{me.bio}</p>}
        <div className="profile-stats">
          <div><b>{followers.length}</b><span>Seguidores</span></div>
          <div><b>{following.size}</b><span>Siguiendo</span></div>
          <div><b style={{ color: 'var(--flame)' }}>🔥 {streak.current}</b><span>Días de racha</span></div>
          <div><b>{myActions.length}</b><span>Acciones</span></div>
        </div>
        <button className="btn soft block mt" onClick={() => router.navigate('/perfil/editar')}>Editar perfil</button>
      </div>

      <div className="h-section"><span>Tu calendario</span><button className="link" onClick={() => router.navigate('/perfil/calendario')}>Ver mes</button></div>
      <button className="card" style={{ width: '100%' }} onClick={() => router.navigate('/perfil/calendario')}>
        <div className="week-strip">
          {WEEKDAYS_SHORT.map((w) => <span key={w}>{w}</span>)}
          {weekDays.map((d) => {
            const ps = myActions.filter((a) => dayKey(a.createdAt) === d).map((a) => a.pillar);
            return (
              <div key={d} className="col" style={{ alignItems: 'center', gap: 3, paddingTop: 6 }}>
                <b style={{ fontSize: 13, color: d === dayKey(today) ? 'var(--sky-deep)' : undefined }}>{parseDay(d).getDate()}</b>
                <span className="cal-dots" style={{ flexDirection: 'column', height: 'auto', gap: 3 }}>
                  {ps.length ? ps.slice(0, 3).map((p, i) => <i key={i} style={{ background: pillar(p).color, width: 7, height: 7 }} />) : <i style={{ background: '#e3eaf0', width: 7, height: 7 }} />}
                </span>
              </div>
            );
          })}
        </div>
      </button>

      <div className="h-section"><span>Tus metas</span><button className="link" onClick={() => router.navigate('/perfil/objetivos')}>Gestionar</button></div>
      <button className="card col" style={{ width: '100%', textAlign: 'left', gap: 10 }} onClick={() => router.navigate('/perfil/objetivos')}>
        <div className="row between"><b style={{ fontSize: 14 }}>Cumplidas esta semana</b><span className="bold" style={{ color: 'var(--sky-deep)' }}>{goalsMet}/{goals.length}</span></div>
        <Bar value={goals.length ? (goalsMet / goals.length) * 100 : 0} color="var(--sky-deep)" height={12} />
        {goals.slice(0, 3).map((g) => (
          <div key={g.id} className="row small">
            <PillarBadge id={g.pillar} size="sm" />
            <span className="grow ellipsis">{g.title}</span>
            <span className="bold">{Math.round((goalCompletion(g, myActions, week) ?? 0) * 100)}%</span>
          </div>
        ))}
        {!goals.length && <span className="subtle">Crea tu primera meta.</span>}
      </button>

      <div className="h-section">Logros</div>
      <div className="badge-grid">
        {badges.map((b) => (
          <div key={b.id} className={`badge ${b.unlocked ? '' : 'locked'}`} title={b.description}>
            <span className="medal">{b.icon === 'turtle' ? <Turtle size={44} animated={false} /> : <Icon name={b.icon as IconKey} size={26} />}</span>
            {b.title}
            {!b.unlocked && <Bar value={b.progress * 100} height={4} />}
          </div>
        ))}
      </div>

      <div className="h-section">Tus últimas acciones</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {recent.map((a) => (
          <button key={a.id} className="photo-wrap" style={{ aspectRatio: '1', borderRadius: 12 }} onClick={() => router.navigate(`/perfil/calendario?dia=${dayKey(a.createdAt)}`)}>
            <Photo src={a.photo} alt={a.description} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function CalendarScreen() {
  const { router, run, now } = useApp();
  const { s, myActions } = useData();
  const today = now();
  const [day, setDay] = useState(router.query.get('dia') ?? dayKey(today));
  const acts = myActions.filter((a) => dayKey(a.createdAt) === day).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const rest = s.restDays.find((r) => r.day === day);
  const d = parseDay(day);
  const canRest = day <= dayKey(addDays(today, 7)) && !acts.length;

  return (
    <div className="screen no-tabs">
      <TopBar back="/perfil" title="Calendario" center />
      <div className="card">
        <MonthCalendar actions={myActions} restDays={s.restDays} selected={day} onSelect={setDay} today={today} />
        <div className="chips mt" style={{ justifyContent: 'center' }}>
          {PILLARS.map((p) => <span key={p.id} className="row small" style={{ gap: 4 }}><i style={{ width: 8, height: 8, borderRadius: 9, background: p.color }} />{p.short}</span>)}
        </div>
      </div>

      <div className="h-section">
        <span>{day === dayKey(today) ? 'Tus acciones de hoy' : `${WEEKDAYS[d.getDay()].charAt(0).toUpperCase()}${WEEKDAYS[d.getDay()].slice(1)}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`} ({acts.length}/3)</span>
      </div>
      {acts.length ? (
        <div className="list">
          {acts.map((a) => (
            <div key={a.id} className="card tight">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div className="thumb" style={{ width: 84, height: 84 }}><Photo src={a.photo} alt={a.description} /></div>
                <div className="grow col" style={{ gap: 4 }}>
                  <div className="row between"><b style={{ fontSize: 15 }}>{pillar(a.pillar).short}</b><span className="subtle">{formatTime(a.createdAt)}</span></div>
                  {a.description && <p style={{ fontSize: 14 }}>{a.description}</p>}
                  <div className="row gap-s small subtle">
                    <Icon name={a.visibility === 'public' ? 'globe' : a.visibility === 'groups' ? 'users' : 'lock'} size={14} />
                    {a.visibility === 'public' ? 'Público' : a.visibility === 'groups' ? 'Grupos' : 'Privado'}
                    {a.originalTakenAt && <> · foto del {formatShortDate(a.originalTakenAt)}</>}
                  </div>
                </div>
                {a.emotion && <EmotionFace id={a.emotion} size={36} />}
              </div>
              {(a.reflection || a.emotion) && (
                <div className="reco mt" style={{ fontSize: 13, marginTop: 10 }}>
                  <Icon name="lock" size={15} style={{ color: 'var(--ink-3)', flex: 'none', marginTop: 2 }} />
                  <span>{a.emotion && <b>Te sentiste {emotion(a.emotion).label.toLowerCase()}. </b>}{a.reflection}</span>
                </div>
              )}
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="btn text small" style={{ color: 'var(--danger)' }} onClick={() => confirm('¿Borrar esta acción y su foto? No se puede deshacer.') && run((b) => b.deleteAction(a.id), 'Acción borrada')}>
                  <Icon name="trash" size={15} /> Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : rest ? (
        <div className="card row"><Turtle pose="rest" size={64} animated={false} /><div className="grow"><b>Día de descanso</b><p className="subtle">{rest.reason}</p></div><button className="btn soft small" onClick={() => run((b) => b.setRestDay(day, null))}>Quitar</button></div>
      ) : (
        <div className="card flat row"><Turtle pose="rest" size={56} animated={false} /><p className="muted grow" style={{ fontSize: 14 }}>No hay acciones este día.</p></div>
      )}
      {canRest && !rest && (
        <button className="btn ghost block mt" onClick={() => run((b) => b.setRestDay(day, 'Día de descanso'), 'Día de descanso marcado: tu racha no se romperá')}>
          <Icon name="moon" size={18} /> Marcar como día de descanso
        </button>
      )}
      <p className="hint mt center">Los días de descanso no rompen tu racha. Descansar también es cuidarse.</p>
    </div>
  );
}

export function EditProfileScreen() {
  const { router, run } = useApp();
  const { me } = useData();
  const [name, setName] = useState(me.name);
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio);
  const [isPublic, setIsPublic] = useState(me.isPublic);
  const [interests, setInterests] = useState<PillarId[]>(me.interests);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="screen no-tabs">
      <TopBar back="/perfil" title="Editar perfil" />
      <div className="col" style={{ alignItems: 'center' }}>
        <button className="member-dot" onClick={() => fileRef.current?.click()} aria-label="Cambiar fotografía">
          {preview ? <img src={preview} className="avatar" style={{ width: 96, height: 96 }} alt="" /> : <Avatar profile={me} size={96} />}
          <span className="ok" style={{ width: 30, height: 30, background: 'var(--sky-deep)' }}><Icon name="camera" size={15} /></span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const b = await compressImage(f, 512);
          setBlob(b);
          setPreview(URL.createObjectURL(b));
        }} />
      </div>
      <div className="col mt">
        <div className="field"><label htmlFor="en">Nombre</label><input id="en" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></div>
        <div className="field"><label htmlFor="eu">Usuario</label><input id="eu" className="input" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} maxLength={20} /></div>
        <div className="field"><label htmlFor="eb">Biografía</label><textarea id="eb" className="textarea" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} /></div>
        <div className="setting">
          <Icon name={isPublic ? 'globe' : 'lock'} style={{ color: 'var(--sky-deep)' }} />
          <div className="grow"><b style={{ fontSize: 14 }}>Perfil público</b><p className="subtle">{isPublic ? 'Cualquiera puede seguirte.' : 'Aprobarás cada solicitud de seguimiento.'}</p></div>
          <Switch checked={isPublic} onChange={setIsPublic} label="Perfil público" />
        </div>
        <div className="field"><label>Intereses</label>
          <div className="chips">
            {PILLARS.map((p) => {
              const on = interests.includes(p.id);
              return <button key={p.id} className={`chip ${on ? 'on' : ''}`} onClick={() => setInterests(on ? interests.filter((x) => x !== p.id) : [...interests, p.id])}>{p.short}</button>;
            })}
          </div>
        </div>
        <button className="btn block mt" onClick={async () => {
          const ok = await run(async (b) => {
            await b.updateProfile({ name: name.trim(), username, bio: bio.trim(), isPublic, interests, ...(blob ? { avatarBlob: blob } : {}) });
            return true;
          }, 'Perfil actualizado');
          if (ok) router.back('/perfil');
        }}>Guardar</button>
      </div>
    </div>
  );
}

export function GoalsScreen() {
  const { run, now } = useApp();
  const { s, me, myActions } = useData();
  const today = now();
  const todayKey = dayKey(today);
  const week = periodEnding(today, 7);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [pillarId, setPillar] = useState<PillarId>('fisica');
  const [target, setTarget] = useState(3);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly');
  const goals = s.goals.filter((g) => !g.archived);

  const save = (g: Goal) => run((b) => b.saveGoal(g));

  return (
    <div className="screen no-tabs">
      <TopBar back="/perfil" title="Tus metas" right={<button className="icon-btn solid" aria-label="Nueva meta" onClick={() => setOpen(true)}><Icon name="plus" /></button>} />
      <p className="muted" style={{ fontSize: 14 }}>Tus acciones del pilar cuentan automáticamente. También puedes marcar un día como cumplido a mano.</p>
      <div className="list mt">
        {goals.map((g) => {
          const c = goalCompletion(g, myActions, week) ?? 0;
          const doneDays = goalDoneDays(g, myActions, week).size;
          const checked = g.checkins.includes(todayKey);
          const p = pillar(g.pillar);
          return (
            <div key={g.id} className="card col" style={{ gap: 8 }}>
              <div className="row">
                <PillarBadge id={g.pillar} />
                <div className="grow">
                  <b style={{ fontSize: 15 }}>{g.title}</b>
                  <p className="subtle small">{g.frequency === 'daily' ? `${g.target} vez al día` : `${g.target} veces por semana`} · desde el {formatShortDate(g.startDate)}</p>
                </div>
                <span className="bold" style={{ color: p.color }}>{Math.round(c * 100)}%</span>
              </div>
              <Bar value={c * 100} color={p.color} />
              <div className="row between">
                <span className="subtle small">{doneDays} {doneDays === 1 ? 'día' : 'días'} esta semana · {c >= 1 ? '✅ Cumplida' : 'En curso'}</span>
                <div className="row gap-s">
                  <button className={`btn small ${checked ? 'soft' : 'ghost'}`} onClick={() => save({ ...g, checkins: checked ? g.checkins.filter((x) => x !== todayKey) : [...g.checkins, todayKey] })}>
                    <Icon name="check" size={15} /> {checked ? 'Hecho hoy' : 'Marcar hoy'}
                  </button>
                  <button className="icon-btn" aria-label="Archivar meta" onClick={() => confirm('¿Archivar esta meta?') && save({ ...g, archived: true, endDate: todayKey })}><Icon name="trash" size={17} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {!goals.length && <p className="subtle center mt">Aún no tienes metas. Pulsa + para crear una.</p>}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nueva meta">
        <div className="col">
          <div className="field"><label htmlFor="gt">¿Qué quieres conseguir?</label><input id="gt" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Caminar tres veces por semana" maxLength={80} /></div>
          <div className="field"><label>Pilar</label>
            <div className="chips">{PILLARS.map((p) => <button key={p.id} className={`chip ${pillarId === p.id ? 'on' : ''}`} onClick={() => setPillar(p.id)}>{p.short}</button>)}</div>
          </div>
          <div className="segmented">
            <button className={frequency === 'weekly' ? 'on' : ''} onClick={() => setFrequency('weekly')}>Por semana</button>
            <button className={frequency === 'daily' ? 'on' : ''} onClick={() => { setFrequency('daily'); setTarget(1); }}>Cada día</button>
          </div>
          {frequency === 'weekly' && (
            <div className="field"><label>{target} veces por semana</label><input type="range" min={1} max={7} value={target} onChange={(e) => setTarget(Number(e.target.value))} /></div>
          )}
          <button className="btn block" disabled={!title.trim()} onClick={async () => {
            await save({ id: uid(), userId: me.id, title: title.trim(), pillar: pillarId, target, frequency, startDate: todayKey, endDate: null, checkins: [], archived: false });
            setOpen(false);
            setTitle('');
          }}>Crear meta</button>
        </div>
      </Sheet>
    </div>
  );
}

export function SettingsScreen() {
  const { router, run, backend, refresh, toast } = useApp();
  const { s, me } = useData();
  const set = (patch: Partial<typeof s.settings>) => run((b) => b.saveSettings({ ...s.settings, ...patch }));

  function exportData() {
    const blob = new Blob([JSON.stringify({ exportadoEl: new Date().toISOString(), ...s, profiles: [me] }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dokapp-${me.username}.json`;
    a.click();
    toast('Datos exportados');
  }

  return (
    <div className="screen no-tabs">
      <TopBar back="/perfil" title="Ajustes" />
      <div className="h-section">Privacidad</div>
      <div className="card" style={{ padding: '4px 16px' }}>
        <div className="setting">
          <Icon name="globe" style={{ color: 'var(--sky-deep)' }} />
          <div className="grow"><b style={{ fontSize: 14 }}>Perfil público</b><p className="subtle">Si lo desactivas, aprobarás cada solicitud.</p></div>
          <Switch checked={me.isPublic} onChange={(v) => run((b) => b.updateProfile({ isPublic: v }))} label="Perfil público" />
        </div>
        <div className="setting">
          <Icon name="users" style={{ color: 'var(--sky-deep)' }} />
          <div className="grow"><b style={{ fontSize: 14 }}>Métricas en grupos</b><p className="subtle">Valor por defecto al unirte a un grupo.</p></div>
          <Switch checked={me.shareMetricsWithGroups} onChange={(v) => run((b) => b.updateProfile({ shareMetricsWithGroups: v }))} label="Métricas en grupos" />
        </div>
        <div className="setting">
          <Icon name="clock" style={{ color: 'var(--sky-deep)' }} />
          <div className="grow"><b style={{ fontSize: 14 }}>Fecha original de las fotos</b><p className="subtle">Mostrar cuándo se tomó una foto importada.</p></div>
          <Switch checked={s.settings.keepOriginalPhotoDate} onChange={(v) => set({ keepOriginalPhotoDate: v })} label="Fecha original" />
        </div>
        <div className="setting">
          <Icon name="bell" style={{ color: 'var(--sky-deep)' }} />
          <div className="grow"><b style={{ fontSize: 14 }}>Recordatorio amable</b><p className="subtle">Un aviso en la app si aún no has registrado nada.</p></div>
          <Switch checked={s.settings.remindersEnabled} onChange={(v) => set({ remindersEnabled: v })} label="Recordatorios" />
        </div>
      </div>

      <div className="h-section">Tus datos (RGPD)</div>
      <div className="list">
        <button className="list-item" onClick={exportData}><Icon name="download" style={{ color: 'var(--sky-deep)' }} /><span className="grow"><b style={{ fontSize: 14 }}>Descargar mis datos</b><br /><span className="subtle">Archivo JSON con todo lo que has registrado.</span></span></button>
        <button className="list-item" onClick={() => router.navigate('/perfil/calendario')}><Icon name="image" style={{ color: 'var(--sky-deep)' }} /><span className="grow"><b style={{ fontSize: 14 }}>Gestionar fotos y publicaciones</b><br /><span className="subtle">Bórralas desde tu calendario.</span></span></button>
      </div>

      <div className="card tint mt">
        <p style={{ fontSize: 13 }}>
          <b>Dokapp no es un servicio médico.</b> Las puntuaciones reflejan participación en hábitos y las recomendaciones son generales.
          No analizamos tus fotos para inferir diagnósticos. Si necesitas ayuda, contacta con profesionales sanitarios; en España puedes llamar al 024 (línea de atención a la conducta suicida).
        </p>
      </div>
      <p className="subtle small mt center">Almacenamiento: {backend.kind === 'supabase' ? 'Supabase (nube)' : backend.kind === 'demo' ? 'Demostración (no se guarda)' : 'Este dispositivo'}</p>

      <div className="col mt-l">
        <button className="btn ghost block" onClick={async () => { await backend.signOut(); await refresh(); router.navigate('/bienvenida', { replace: true }); }}><Icon name="logout" size={18} /> Cerrar sesión</button>
        <button className="btn danger block" onClick={async () => {
          if (!confirm('Se borrarán tu cuenta, tus fotos, publicaciones, emociones y progreso. ¿Continuar?')) return;
          await run((b) => b.deleteAccount(), 'Cuenta eliminada');
          router.navigate('/bienvenida', { replace: true });
        }}><Icon name="trash" size={18} /> Eliminar mi cuenta</button>
      </div>
      <div className="col center mt-l" style={{ alignItems: 'center' }}><Turtle size={60} animated={false} /><span className="subtle small">Dokapp: Bienestar · v0.1</span></div>
    </div>
  );
}
