import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Turtle } from '../components/Turtle';
import { Photo, PillarBadge } from '../components/ui';
import { dayKey, formatLongDate, formatTime } from '../domain/dates';
import { pillar } from '../domain/pillars';
import { MAX_DAILY_ACTIONS, personalStreak } from '../domain/streaks';
import { captureVideoFrame, compressImage, readExifDate } from '../lib/image';
import { tipOfDay } from '../content/library';
import { useApp, useData } from '../state/app';
import { CaptureFlow, CaptureDraft } from './CaptureFlow';

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

type CamState = 'idle' | 'starting' | 'live' | 'denied' | 'unsupported';

export function CameraScreen() {
  const { router, preview, now, backend } = useApp();
  const { s, me, myActions } = useData();
  const today = now();
  const todays = myActions.filter((a) => dayKey(a.createdAt) === dayKey(today)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const done = todays.length;
  const streak = personalStreak(myActions, s.restDays, today);
  const left = MAX_DAILY_ACTIONS - done;

  const paso = router.query.get('paso');
  const [draft, setDraft] = useState<CaptureDraft | null>(() =>
    paso ? { photo: router.query.get('foto') ?? 'scene:sendero', preview: '', originalTakenAt: null } : null,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const shootRef = useRef<HTMLInputElement>(null);
  const [cam, setCam] = useState<CamState>('idle');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const demoFeed = preview || backend.kind === 'demo';

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  async function start(face = facing) {
    if (!navigator.mediaDevices?.getUserMedia) return setCam('unsupported');
    setCam('starting');
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: face, width: { ideal: 1440 }, height: { ideal: 1800 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCam('live');
    } catch (e) {
      setCam((e as DOMException).name === 'NotAllowedError' ? 'denied' : 'unsupported');
    }
  }

  // Si el permiso ya estaba concedido, la cámara arranca sola; si no, se pide al pulsar.
  useEffect(() => {
    if (demoFeed || draft || left <= 0) return;
    let cancelled = false;
    navigator.permissions?.query({ name: 'camera' as PermissionName }).then((p) => {
      if (!cancelled && p.state === 'granted') start();
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, left, demoFeed]);

  async function shoot() {
    if (left <= 0) return;
    if (demoFeed && cam !== 'live') {
      setDraft({ photo: 'scene:atardecer', preview: '', originalTakenAt: null });
      return;
    }
    if (cam === 'live' && videoRef.current) {
      const blob = await captureVideoFrame(videoRef.current);
      stop();
      setCam('idle');
      setDraft({ photo: blob, preview: URL.createObjectURL(blob), originalTakenAt: null });
      return;
    }
    if (cam === 'idle') return start();
    // Sin acceso a la cámara en vivo: cámara nativa del sistema.
    shootRef.current?.click();
  }

  async function onFile(file: File | undefined, fromGallery: boolean) {
    if (!file) return;
    const taken = fromGallery ? await readExifDate(file) : null;
    const blob = await compressImage(file);
    stop();
    setCam('idle');
    setDraft({ photo: blob, preview: URL.createObjectURL(blob), originalTakenAt: taken ?? (fromGallery && file.lastModified ? new Date(file.lastModified).toISOString() : null) });
  }

  if (draft) {
    return (
      <CaptureFlow
        draft={draft}
        initialStep={paso === 'emocion' ? 1 : paso === 'publicar' ? 2 : 0}
        onDone={() => {
          setDraft(null);
          if (paso) router.navigate('/', { replace: true });
        }}
      />
    );
  }

  const tip = tipOfDay(today);
  const hour = today.getHours();
  const hello = hour < 6 ? 'Buenas noches' : hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="screen">
      <div className="row between" style={{ paddingTop: 16 }}>
        <div>
          <p className="subtle">{capitalize(formatLongDate(today))}</p>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>{hello}, {me.name.split(' ')[0] || me.username} 👋</h2>
        </div>
        <span className="streak-pill" title="Tu racha actual"><Icon name="flame" size={16} /> {streak.current}</span>
      </div>

      <div className="card tight row between mt" style={{ padding: '10px 14px' }}>
        <div className="row gap-s">
          <Icon name="sun" size={20} style={{ color: '#F5A524' }} />
          <b style={{ fontSize: 15 }}>Tu acción del día</b>
        </div>
        <div className="col" style={{ gap: 4, alignItems: 'flex-end' }}>
          <span className="small bold" style={{ color: 'var(--sky-deep)' }}>{done} de {MAX_DAILY_ACTIONS} acciones de hoy</span>
          <span className="counter-dots">{Array.from({ length: MAX_DAILY_ACTIONS }, (_, i) => <i key={i} className={i < done ? 'on' : ''} />)}</span>
        </div>
      </div>

      <div className="mt">
        {left <= 0 ? (
          <div className="viewfinder" style={{ background: 'linear-gradient(180deg, #EAF7FF, #fff)', display: 'grid', placeItems: 'center' }}>
            <div className="col center" style={{ alignItems: 'center', padding: 24 }}>
              <Turtle pose="celebrate" size={150} />
              <h3 style={{ fontSize: 20, fontWeight: 900 }}>¡Tres de tres!</h3>
              <p className="muted">Has completado tus acciones de hoy. Descansa: mañana más.</p>
            </div>
          </div>
        ) : (
          <div className="viewfinder">
            <video ref={videoRef} playsInline muted style={{ display: cam === 'live' ? 'block' : 'none', transform: facing === 'user' ? 'scaleX(-1)' : undefined }} />
            {cam !== 'live' && (demoFeed ? (
              <Photo src="scene:atardecer" />
            ) : (
              <button onClick={() => start()} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(160deg, #3b5b8c, #73c9f5)' }}>
                <span className="col" style={{ alignItems: 'center', gap: 10, padding: 24, textAlign: 'center' }}>
                  {cam === 'starting' ? <span className="spinner" /> : <Icon name="camera" size={44} />}
                  <b style={{ fontSize: 17 }}>
                    {cam === 'denied' ? 'Sin permiso de cámara' : cam === 'unsupported' ? 'Cámara no disponible' : 'Activar cámara'}
                  </b>
                  <span style={{ fontSize: 13, opacity: 0.9 }}>
                    {cam === 'denied'
                      ? 'Puedes permitirlo en los ajustes del navegador o subir una foto de tu galería.'
                      : cam === 'unsupported'
                        ? 'Usa el botón central para abrir la cámara del sistema o importa una foto.'
                        : 'Te pediremos permiso solo para hacer la foto.'}
                  </span>
                </span>
              </button>
            ))}
            <div className="vf-overlay">
              <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
              {cam === 'live' && (
                <div className="vf-top">
                  <button aria-label="Cambiar cámara" onClick={() => { const f = facing === 'user' ? 'environment' : 'user'; setFacing(f); start(f); }}><Icon name="flip" size={18} /></button>
                </div>
              )}
              <span className="vf-badge">Hoy · {formatTime(today.toISOString())}</span>
            </div>
          </div>
        )}
      </div>

      <div className="shutter-row">
        <button className="side-btn" aria-label="Importar desde la galería" onClick={() => fileRef.current?.click()} disabled={left <= 0}>
          <Icon name="image" />
        </button>
        <button className="shutter" aria-label="Hacer foto" onClick={shoot} disabled={left <= 0}><i /></button>
        <button className="side-btn" aria-label="Ver calendario" onClick={() => router.navigate('/perfil/calendario')}>
          <Icon name="calendar" />
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0], true); e.target.value = ''; }} />
      <input ref={shootRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0], false); e.target.value = ''; }} />
      <p className="center subtle mt">Cada pequeña acción cuenta.</p>

      <div className="h-section">
        <span>Tus acciones de hoy ({done}/{MAX_DAILY_ACTIONS})</span>
        <button className="link" onClick={() => router.navigate('/perfil/calendario')}>Ver calendario</button>
      </div>
      {todays.length ? (
        <div className="list">
          {todays.map((a) => (
            <div key={a.id} className="list-item">
              <div className="thumb"><Photo src={a.photo} /></div>
              <div className="grow">
                <b style={{ fontSize: 14 }}>{pillar(a.pillar).short}</b>
                <p className="subtle ellipsis">{a.description || pillar(a.pillar).name}</p>
              </div>
              <span className="subtle">{formatTime(a.createdAt)}</span>
              <PillarBadge id={a.pillar} size="sm" />
            </div>
          ))}
        </div>
      ) : (
        <div className={`card row ${s.settings.remindersEnabled && hour >= 18 ? 'tint' : 'flat'}`}>
          <Turtle size={56} animated={false} pose={s.settings.remindersEnabled && hour >= 18 ? 'wave' : 'meditate'} />
          <p className="muted" style={{ fontSize: 14 }}>
            {s.settings.remindersEnabled && hour >= 18
              ? <><b>Recordatorio amable:</b> aún estás a tiempo de una pequeña acción. Sin presión 💙</>
              : 'Aún no has registrado nada hoy. ¿Un vaso de agua, un paseo, una pausa?'}
          </p>
        </div>
      )}

      <div className="card tint row mt" style={{ alignItems: 'flex-start' }}>
        <PillarBadge id={tip.pillar} size="sm" solid />
        <div>
          <b className="small" style={{ color: 'var(--sky-deep)' }}>CONSEJO DEL DÍA</b>
          <p style={{ fontSize: 14 }}>{tip.text}</p>
        </div>
      </div>
    </div>
  );
}
