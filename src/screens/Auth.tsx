import { FormEvent, useState } from 'react';
import { Icon } from '../components/Icon';
import { Turtle, TurtlePose } from '../components/Turtle';
import { useApp } from '../state/app';

const SLIDES: { pose: TurtlePose; title: string; text: string }[] = [
  { pose: 'meditate', title: 'Registra tus acciones', text: 'Haz una foto de lo que haces por tu bienestar. Hasta tres pequeñas acciones al día.' },
  { pose: 'read', title: 'Aprende a cuidarte', text: 'Siete caminos con lecciones breves, retos y herramientas para cada pilar del bienestar.' },
  { pose: 'celebrate', title: 'Comparte y motívate', text: 'Sigue a tus amistades, crea grupos y mantened juntos vuestra racha. Sin rankings ni comparaciones.' },
];

export function Welcome({ initialSlide = 0 }: { initialSlide?: number }) {
  const { router } = useApp();
  const [i, setI] = useState(initialSlide);
  const s = SLIDES[i];
  return (
    <div className="auth" style={{ justifyContent: 'space-between' }}>
      <div className="row between">
        <b style={{ color: 'var(--sky-deep)', fontWeight: 900, fontSize: 18 }}>Dokapp</b>
        <button className="btn text small" onClick={() => router.navigate('/entrar')}>Ya tengo cuenta</button>
      </div>
      <div className="col center" style={{ alignItems: 'center', gap: 14 }} key={i}>
        <div className="pop"><Turtle pose={s.pose} size={190} /></div>
        <h1 style={{ fontSize: 26 }}>{s.title}</h1>
        <p className="muted" style={{ fontSize: 16, maxWidth: 300, lineHeight: 1.5 }}>{s.text}</p>
      </div>
      <div className="col" style={{ gap: 18 }}>
        <div className="dots">{SLIDES.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        {i < SLIDES.length - 1 ? (
          <button className="btn block" onClick={() => setI(i + 1)}>Siguiente</button>
        ) : (
          <button className="btn block" onClick={() => router.navigate('/registro')}>Crear mi cuenta</button>
        )}
        <p className="subtle center">Pequeñas acciones. Grandes cambios.</p>
      </div>
    </div>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { backend, refresh, router } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const register = mode === 'register';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (register && !consent) return setError('Necesitamos tu consentimiento para tratar tus datos.');
    setBusy(true);
    try {
      if (register) await backend.signUp(email, password);
      else await backend.signIn(email, password);
      await refresh();
      router.navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth" onSubmit={submit}>
      <button type="button" className="icon-btn" aria-label="Volver" onClick={() => router.back('/bienvenida')}><Icon name="chevronLeft" /></button>
      <div className="col" style={{ alignItems: 'center', gap: 6 }}>
        <Turtle pose={register ? 'wave' : 'meditate'} size={110} />
        <h1>{register ? 'Crea tu cuenta' : 'Hola de nuevo'}</h1>
        <p className="muted center">{register ? 'Tu bienestar, una acción cada día.' : 'Inicia sesión para seguir cuidándote.'}</p>
      </div>
      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required />
      </div>
      <div className="field">
        <label htmlFor="pw">Contraseña</label>
        <input id="pw" className="input" type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required minLength={register ? 8 : undefined} />
      </div>
      {register && (
        <label className="row" style={{ alignItems: 'flex-start', fontSize: 13, color: 'var(--ink-2)' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
          <span>Acepto que Dokapp trate mis datos para ofrecerme el servicio. Mis emociones y reflexiones son privadas por defecto y puedo exportar o borrar mis datos cuando quiera.</span>
        </label>
      )}
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="btn block" disabled={busy}>{busy ? 'Un momento…' : register ? 'Crear cuenta' : 'Entrar'}</button>
      <button type="button" className="btn text" onClick={() => router.navigate(register ? '/entrar' : '/registro', { replace: true })}>
        {register ? '¿Ya tienes cuenta? Inicia sesión' : '¿Eres nuevo? Crea una cuenta'}
      </button>
      {backend.kind === 'local' && (
        <p className="subtle center">Modo local: tus datos se guardan solo en este dispositivo.</p>
      )}
    </form>
  );
}
