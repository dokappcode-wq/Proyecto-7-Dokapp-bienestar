import type { PillarId } from './types';

export interface Pillar {
  id: PillarId;
  name: string;
  short: string;
  tagline: string;
  description: string;
  color: string;
  soft: string;
  icon: IconName;
  examples: string[];
}

export type IconName =
  | 'leaf' | 'brain' | 'heart' | 'run' | 'apple' | 'phoneOff' | 'lotus';

export const PILLARS: Pillar[] = [
  {
    id: 'ecologia', name: 'Pertenencia ecológica', short: 'Naturaleza',
    tagline: 'Cuida el planeta, cuida tu hogar',
    description: 'Tu relación con la naturaleza, la sostenibilidad y el entorno en el que vives.',
    color: '#3FB37F', soft: '#E3F6EC', icon: 'leaf',
    examples: ['Paseo por un parque', 'Separar residuos', 'Ir en bici al trabajo', 'Cuidar una planta'],
  },
  {
    id: 'mental', name: 'Salud mental', short: 'Mente',
    tagline: 'Gestiona tu estrés y descansa',
    description: 'Descanso, gestión del estrés, autoestima, autocuidado y concentración.',
    color: '#3E9BE0', soft: '#E2F1FC', icon: 'brain',
    examples: ['Dormir 8 horas', 'Pausa sin pantallas', 'Escribir lo que te preocupa', 'Pedir ayuda'],
  },
  {
    id: 'emocional', name: 'Inteligencia emocional', short: 'Emociones',
    tagline: 'Conócete y conecta mejor',
    description: 'Reconocer emociones, empatía, comunicación y relaciones personales.',
    color: '#E8657A', soft: '#FCE8EB', icon: 'heart',
    examples: ['Llamar a un amigo', 'Nombrar cómo te sientes', 'Escuchar sin interrumpir', 'Dar las gracias'],
  },
  {
    id: 'fisica', name: 'Salud física', short: 'Movimiento',
    tagline: 'Tu cuerpo también es mente',
    description: 'Ejercicio, movilidad, deporte, descanso físico y actividad diaria.',
    color: '#8A7CF0', soft: '#EEEBFD', icon: 'run',
    examples: ['Correr 20 minutos', 'Estiramientos', 'Subir escaleras', 'Clase de yoga'],
  },
  {
    id: 'alimentacion', name: 'Alimentación', short: 'Alimentación',
    tagline: 'Come rico, vive mejor',
    description: 'Nutrición equilibrada, hidratación, alimentación consciente y cocina saludable.',
    color: '#F5A524', soft: '#FEF3DE', icon: 'apple',
    examples: ['Cocinar en casa', 'Beber agua', 'Fruta de temporada', 'Comer sin pantallas'],
  },
  {
    id: 'digital', name: 'Desintoxicación digital', short: 'Desconexión',
    tagline: 'Desconecta para conectar',
    description: 'Uso consciente de pantallas, redes sociales y atención plena.',
    color: '#2FB5B9', soft: '#DFF5F5', icon: 'phoneOff',
    examples: ['Móvil fuera del dormitorio', 'Una hora sin notificaciones', 'Leer en papel', 'Borrar una app'],
  },
  {
    id: 'espiritual', name: 'Indagación espiritual', short: 'Espiritualidad',
    tagline: 'Haz espacio para lo importante',
    description: 'Reflexión, meditación, propósito, valores, gratitud y búsqueda de sentido. Abierta a cualquier creencia o a ninguna.',
    color: '#A77BE0', soft: '#F2EBFB', icon: 'lotus',
    examples: ['Meditar 10 minutos', 'Tres gratitudes', 'Contemplar un atardecer', 'Escribir tus valores'],
  },
];

export const PILLAR_IDS = PILLARS.map((p) => p.id);

const byId = new Map(PILLARS.map((p) => [p.id, p]));
export const pillar = (id: PillarId): Pillar => byId.get(id)!;
