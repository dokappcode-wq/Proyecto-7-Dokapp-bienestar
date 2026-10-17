import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Turtle } from '../components/Turtle';
import { EmotionFace, Photo, PillarBadge, Switch } from '../components/ui';
import { formatShortDate, formatTime } from '../domain/dates';
import { EMOTIONS } from '../domain/emotions';
import { PILLARS, pillar } from '../domain/pillars';
import type { EmotionId, PillarId, Visibility } from '../domain/types';
import { useApp, useData } from '../state/app';

export interface CaptureDraft {
  photo: Blob | string;
  preview: string; // object URL para blobs
  originalTakenAt: string | null;
}

const CHEERS = [
  '¡Una acción más para cuidar de ti!',
  '¡Cada pequeño paso cuenta!',
  '¡Tu yo del futuro te lo agradece!',
  '¡Qué bien te cuidas!',
  'Pequeñas acciones, grandes cambios.',
];

export function CaptureFlow({ draft, initialStep = 0, onDone }: { draft: CaptureDraft; initialStep?: number; onDone: () => void }) {
  const { run, snap, router } = useApp();
  const { myGroups, me } = useData();
  const [step, setStep] = useState(initialStep);
  const [pillarId, setPillar] = useState<PillarId | null>(initialStep > 0 ? 'ecologia' : null);
  const [description, setDescription] = useState(initialStep > 0 ? 'Paseo al atardecer' : '');
  const [emotionId, setEmotion] = useState<EmotionId | null>(initialStep > 1 ? 'feliz' : null);
  const [reflection, setReflection] = useState('');
  const [shareEmotion, setShareEmotion] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>(me.isPublic ? 'public' : 'private');
  const [groupIds, setGroupIds] = useState<string[]>(myGroups.slice(0, 1).map((g) => g.id));
  const [allowComments, setAllowComments] = useState(true);
  const [keepDate, setKeepDate] = useState(snap!.settings.keepOriginalPhotoDate);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const cheer = useMemo(() => CHEERS[Math.floor(Math.random() * CHEERS.length)], []);

  const photoEl = typeof draft.photo === 'string' ? <Photo src={draft.photo} /> : <img src={draft.preview} className="photo" alt="Tu foto" />;

  async function save() {
    if (!pillarId) return;
    setBusy(true);
    const r = await run((b) => b.createAction({
      photo: draft.photo, pillar: pillarId, description, emotion: emotionId, reflection, shareEmotion,
      visibility, groupIds, allowComments, originalTakenAt: keepDate ? draft.originalTakenAt : null,
    }));
    setBusy(false);
    if (r) setCelebrate(cheer);
  }

  if (celebrate) {
    return (
      <div className="celebrate">
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 26 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, background: PILLARS[i % 7].color, animationDelay: `${(i % 9) * 0.08}s` }} />
          ))}
        </div>
        <div className="pop"><Turtle pose="celebrate" size={190} /></div>
        <h2>{celebrate}</h2>
        <p className="muted">Guardada en tu calendario{visibility === 'public' ? ' y compartida con quien te sigue' : visibility === 'groups' ? ' y en tus grupos' : ''}.</p>
        <div className="col" style={{ width: '100%', maxWidth: 300, marginTop: 10 }}>
          <button className="btn block" onClick={onDone}>Genial</button>
          <button className="btn ghost block" onClick={() => { onDone(); router.navigate('/seguimiento'); }}>Ver mi progreso</button>
        </div>
      </div>
    );
  }

  const titles = ['¿Qué es?', '¿Cómo te sientes después de esta acción?', '¿Quién puede verlo?'];

  return (
    <div className="screen full no-tabs" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
      <div className="capture-hero" style={{ height: step === 0 ? '42%' : '30%' }}>
        {photoEl}
        <button className="icon-btn solid" style={{ position: 'absolute', top: 14, left: 14 }} aria-label={step ? 'Atrás' : 'Descartar foto'} onClick={() => (step ? setStep(step - 1) : onDone())}>
          <Icon name={step ? 'chevronLeft' : 'close'} />
        </button>
        {draft.originalTakenAt && (
          <span className="vf-badge">Foto del {formatShortDate(draft.originalTakenAt)}, {formatTime(draft.originalTakenAt)}</span>
        )}
      </div>
      <div className="capture-panel">
        <div className="steps">{[0, 1, 2].map((k) => <i key={k} className={k <= step ? 'on' : ''} />)}</div>
        <h2 style={{ fontSize: 19, fontWeight: 900, marginBottom: 16 }}>{titles[step]}</h2>

        {step === 0 && (
          <>
            <div className="option-grid">
              {PILLARS.map((p) => (
                <button key={p.id} className={`option ${pillarId === p.id ? 'on' : ''}`} style={{ color: pillarId === p.id ? p.color : undefined }} onClick={() => setPillar(p.id)} aria-pressed={pillarId === p.id}>
                  <PillarBadge id={p.id} solid={pillarId === p.id} />
                  <span style={{ color: 'var(--ink-2)' }}>{p.short}</span>
                </button>
              ))}
            </div>
            {pillarId && <p className="subtle mt center">{pillar(pillarId).name}: {pillar(pillarId).tagline.toLowerCase()}</p>}
            <div className="field mt">
              <label htmlFor="desc">Descripción (opcional)</label>
              <input id="desc" className="input" value={description} maxLength={280} onChange={(e) => setDescription(e.target.value)} placeholder={pillarId ? `Ej.: ${pillar(pillarId).examples[0]}` : '¿Qué has hecho?'} />
            </div>
            <button className="btn block mt-l" disabled={!pillarId} onClick={() => setStep(1)}>Continuar</button>
          </>
        )}

        {step === 1 && (
          <>
            <div className="emotion-grid">
              {EMOTIONS.slice(0, 3).map((e) => (
                <button key={e.id} className={`emotion-btn ${emotionId === e.id ? 'on' : ''}`} onClick={() => setEmotion(e.id)} aria-pressed={emotionId === e.id}>
                  <EmotionFace id={e.id} size={62} />{e.label}
                </button>
              ))}
            </div>
            <div className="emotion-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 14, padding: '0 16%' }}>
              {EMOTIONS.slice(3).map((e) => (
                <button key={e.id} className={`emotion-btn ${emotionId === e.id ? 'on' : ''}`} onClick={() => setEmotion(e.id)} aria-pressed={emotionId === e.id}>
                  <EmotionFace id={e.id} size={62} />{e.label}
                </button>
              ))}
            </div>
            <div className="field mt">
              <label htmlFor="refl">Una reflexión breve (opcional)</label>
              <textarea id="refl" className="textarea" value={reflection} maxLength={1000} onChange={(e) => setReflection(e.target.value)} placeholder="¿Qué has notado en ti?" />
            </div>
            <div className="setting">
              <Icon name="lock" style={{ color: 'var(--sky-deep)' }} />
              <div className="grow"><b style={{ fontSize: 14 }}>Compartir mi emoción</b><p className="subtle">Por defecto, tus emociones y reflexiones son solo tuyas.</p></div>
              <Switch checked={shareEmotion} onChange={setShareEmotion} label="Compartir emoción" />
            </div>
            <button className="btn block mt" onClick={() => setStep(2)}>{emotionId ? 'Continuar' : 'Omitir'}</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="col">
              {([
                ['public', 'globe', 'Público', 'Aparece en el feed de quien te sigue.'],
                ['groups', 'users', 'Solo grupos', 'Solo lo verán los grupos que elijas.'],
                ['private', 'lock', 'Privado', 'Solo en tu calendario personal.'],
              ] as const).map(([v, icon, t, d]) => (
                <button key={v} className={`vis-option ${visibility === v ? 'on' : ''}`} onClick={() => setVisibility(v)} disabled={v === 'groups' && !myGroups.length} style={v === 'groups' && !myGroups.length ? { opacity: 0.5 } : undefined}>
                  <Icon name={icon} style={{ color: 'var(--sky-deep)' }} />
                  <span className="grow"><b>{t}</b><br /><span className="subtle">{v === 'groups' && !myGroups.length ? 'Aún no formas parte de ningún grupo.' : d}</span></span>
                  {visibility === v && <Icon name="check" style={{ color: 'var(--sky-deep)' }} />}
                </button>
              ))}
            </div>
            {visibility === 'groups' && (
              <div className="chips mt">
                {myGroups.map((g) => {
                  const on = groupIds.includes(g.id);
                  return <button key={g.id} className={`chip ${on ? 'on' : ''}`} onClick={() => setGroupIds(on ? groupIds.filter((x) => x !== g.id) : [...groupIds, g.id])}>{g.name}</button>;
                })}
              </div>
            )}
            {visibility !== 'private' && (
              <div className="setting">
                <Icon name="message" style={{ color: 'var(--sky-deep)' }} />
                <b className="grow" style={{ fontSize: 14 }}>Permitir comentarios</b>
                <Switch checked={allowComments} onChange={setAllowComments} label="Permitir comentarios" />
              </div>
            )}
            {draft.originalTakenAt && (
              <div className="setting">
                <Icon name="clock" style={{ color: 'var(--sky-deep)' }} />
                <div className="grow"><b style={{ fontSize: 14 }}>Mostrar fecha original</b><p className="subtle">Tomada el {formatShortDate(draft.originalTakenAt)}. Se registrará hoy en Dokapp.</p></div>
                <Switch checked={keepDate} onChange={setKeepDate} label="Mostrar fecha original" />
              </div>
            )}
            <button className="btn block mt" onClick={save} disabled={busy || (visibility === 'groups' && !groupIds.length)}>{busy ? 'Guardando…' : 'Guardar'}</button>
          </>
        )}
      </div>
    </div>
  );
}
