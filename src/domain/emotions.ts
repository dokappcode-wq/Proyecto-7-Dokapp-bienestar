import type { EmotionId } from './types';

export interface Emotion {
  id: EmotionId;
  label: string;
  color: string;
  soft: string;
}

export const EMOTIONS: Emotion[] = [
  { id: 'triste', label: 'Triste', color: '#5B8DEF', soft: '#E4ECFD' },
  { id: 'enfadado', label: 'Enfadado', color: '#EF6B5B', soft: '#FDE6E3' },
  { id: 'feliz', label: 'Feliz', color: '#F5B82E', soft: '#FEF4D9' },
  { id: 'motivado', label: 'Motivado', color: '#3FB37F', soft: '#E3F6EC' },
  { id: 'cansado', label: 'Cansado', color: '#9C8CE8', soft: '#EFECFC' },
];

const byId = new Map(EMOTIONS.map((e) => [e.id, e]));
export const emotion = (id: EmotionId): Emotion => byId.get(id)!;

/** Valencia orientativa para dibujar la evolución emocional (no es una medida clínica). */
export const EMOTION_VALENCE: Record<EmotionId, number> = {
  triste: 1, enfadado: 1, cansado: 2, feliz: 4, motivado: 4,
};
