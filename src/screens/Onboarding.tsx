import { useRef, useState } from 'react';
import { uid } from '../data/backend';
import { dayKey } from '../domain/dates';
import { PILLARS } from '../domain/pillars';
import type { Goal, PillarId } from '../domain/types';
import { Icon } from '../components/Icon';
import { Turtle } from '../components/Turtle';
import { Avatar, PillarBadge } from '../components/ui';
import { compressImage } from '../lib/image';
import { useApp } from '../state/app';

const SUGGESTED_GOALS: { title: string; pillar: PillarId; target: number; frequency: 'daily' | 'weekly' }[] = [
  { title: 'Caminar tres veces por semana', pillar: 'fisica', target: 3, frequency: 'weekly' },
  { title: 'Leer diez minutos al día', pillar: 'mental', target: 1, frequency: 'daily' },
  { title: 'Reducir el tiempo en redes sociales', pillar: 'digital', target: 4, frequency: 'weekly' },
  { title: 'Meditar cuatro veces por semana', pillar: 'espiritual', target: 4, frequency: 'weekly' },
  { title: 'Cocinar en casa cinco días', pillar: 'alimentacion', target: 5, frequency: 'weekly' },
  { title: 'Pasear por la naturaleza dos veces', pillar: 'ecologia', target: 2, frequency: 'weekly' },
  { title: 'Llamar a alguien querido cada semana', pillar: 'emocional', target: 1, frequency: 'weekly' },
];

export function Onboarding({ initialStep = 0 }: { initialStep?: number }) {
  const { snap, backend, refresh, toast, router, now } = useApp();
  const me = snap!.me;
  const [step, setStep] = useState(initialStep);
  const [name, setName] = useState(me.name);
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [interests, setInterests] = useState<PillarId[]>(me.interests.length ? me.interests : initialStep ? ['ecologia', 'fisica', 'alimentacion'] : []);
  const [goals, setGoals] = useState<number[]>(initialStep ? [0, 1] : []);
  const [isPublic, setIsPublic] = useState(me.isPublic);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const STEPS = 4;

  async function next() {
    setError('');
    if (step === 0) {
      if (!name.trim()) return setError('¿Cómo te llamamos?');
      if (!/^[a-z0-9_.]{3,20}$/.test(username)) return setError('El usuario debe tener 3–20 caracteres: letras minúsculas, números, punto o guion bajo.');
      if (!(await backend.isUsernameAvailable(username))) return setError('Ese nombre de usuario ya está en uso.');
    }
    if (step === 1 && !interests.length) return setError('Elige al menos un pilar.');
    if (step < STEPS - 1) return setStep(step + 1);
    setBusy(true);
    try {
      await backend.updateProfile({ name: name.trim(), username, bio: bio.trim(), isPublic, interests, onboarded: true, ...(avatarBlob ? { avatarBlob } : {}) });
      for (const i of goals) {
        const g = SUGGESTED_GOALS[i];
        const goal: Goal = { id: uid(), userId: me.id, ...g, startDate: dayKey(now()), endDate: null, checkins: [], archived: false };
        await backend.saveGoal(goal);
      }
      await refresh();
      toast('¡Te damos la bienvenida a Dokapp! 🐢');
      router.navigate('/', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="row between">
        {step > 0 ? <button className="icon-btn" aria-label="Atrás" onClick={() => setStep(step - 1)}><Icon name="chevronLeft" /></button> : <span style={{ width: 40 }} />}
        <div className="dots">{Array.from({ length: STEPS }, (_, k) => <i key={k} className={k === step ? 'on' : ''} />)}</div>
        <span style={{ width: 40 }} />
      </div>

      {step === 0 && (
        <>
          <h1>Crea tu perfil</h1>
          <div className="col" style={{ alignItems: 'center' }}>
            <button className="member-dot" onClick={() => fileRef.current?.click()} aria-label="Elegir fotografía de perfil">
              {avatarPreview ? <img src={avatarPreview} className="avatar" style={{ width: 96, height: 96 }} alt="" /> : <Avatar profile={{ ...me, name }} size={96} />}
              <span className="ok" style={{ width: 30, height: 30, background: 'var(--sky-deep)' }}><Icon name="camera" size={15} /></span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const b = await compressImage(f, 512);
              setAvatarBlob(b);
              setAvatarPreview(URL.createObjectURL(b));
            }} />
          </div>
          <div className="field"><label htmlFor="n">Nombre</label><input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="¿Cómo te llamas?" maxLength={40} /></div>
          <div className="field"><label htmlFor="u">Nombre de usuario</label><input id="u" className="input" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="tunombre" maxLength={20} /></div>
          <div className="field"><label htmlFor="b">Biografía (opcional)</label><input id="b" className="input" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Algo sobre ti" maxLength={160} /></div>
        </>
      )}

      {step === 1 && (
        <>
          <h1>¿Qué te gustaría cuidar?</h1>
          <p className="muted">Elige los pilares que más te interesan. Podrás explorar todos.</p>
          <div className="interest-grid">
            {PILLARS.map((p) => {
              const on = interests.includes(p.id);
              return (
                <button key={p.id} className={`interest ${on ? 'on' : ''}`} onClick={() => setInterests(on ? interests.filter((x) => x !== p.id) : [...interests, p.id])} aria-pressed={on}>
                  <PillarBadge id={p.id} size="sm" />
                  {p.name}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1>Tus primeros objetivos</h1>
          <p className="muted">Empieza con uno o dos. Pequeño y concreto funciona mejor.</p>
          <div className="list">
            {SUGGESTED_GOALS.map((g, i) => {
              const on = goals.includes(i);
              return (
                <button key={g.title} className={`interest ${on ? 'on' : ''}`} onClick={() => setGoals(on ? goals.filter((x) => x !== i) : [...goals, i])} aria-pressed={on}>
                  <PillarBadge id={g.pillar} size="sm" />
                  <span className="grow">{g.title}</span>
                  {on && <Icon name="check" size={18} style={{ color: 'var(--sky-deep)' }} />}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1>Tu privacidad</h1>
          <p className="muted">Tú decides quién ve tus acciones. Puedes cambiarlo cuando quieras y elegirlo también en cada foto.</p>
          {[
            { v: false, icon: 'lock' as const, t: 'Perfil privado', d: 'Solo te ven las personas que apruebes.' },
            { v: true, icon: 'globe' as const, t: 'Perfil público', d: 'Cualquiera puede seguirte y ver tus acciones públicas.' },
          ].map((o) => (
            <button key={o.t} className={`vis-option ${isPublic === o.v ? 'on' : ''}`} onClick={() => setIsPublic(o.v)}>
              <Icon name={o.icon} style={{ color: 'var(--sky-deep)' }} />
              <span className="grow"><b>{o.t}</b><br /><span className="subtle">{o.d}</span></span>
            </button>
          ))}
          <div className="card tint row" style={{ alignItems: 'flex-start' }}>
            <Turtle size={54} animated={false} />
            <p style={{ fontSize: 13 }}>Tus emociones y reflexiones son <b>privadas por defecto</b>. Dokapp no analiza tus fotos ni hace diagnósticos.</p>
          </div>
        </>
      )}

      {error && <p className="error-text" role="alert">{error}</p>}
      <div style={{ flex: 1 }} />
      <button className="btn block" onClick={next} disabled={busy}>{step === STEPS - 1 ? (busy ? 'Guardando…' : 'Empezar') : 'Continuar'}</button>
    </div>
  );
}
