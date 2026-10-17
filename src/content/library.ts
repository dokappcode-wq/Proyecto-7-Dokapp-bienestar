// Lecturas recomendadas y consejos diarios por pilar.

import type { PillarId } from '../domain/types';

export interface Reading {
  title: string;
  author: string;
  kind: 'Libro' | 'Guía' | 'Artículo';
  description: string;
  url?: string;
}

export const READINGS: Record<PillarId, Reading[]> = {
  ecologia: [
    { title: 'Primavera silenciosa', author: 'Rachel Carson', kind: 'Libro', description: 'El clásico que despertó la conciencia ambiental moderna sobre el impacto de los pesticidas.' },
    { title: 'Una trenza de hierba sagrada', author: 'Robin Wall Kimmerer', kind: 'Libro', description: 'Botánica y sabiduría indígena para mirar la naturaleza con gratitud y reciprocidad.' },
    { title: 'Los últimos niños en el bosque', author: 'Richard Louv', kind: 'Libro', description: 'Sobre el «déficit de naturaleza» y la importancia del contacto con lo natural.' },
  ],
  mental: [
    { title: 'Por qué dormimos', author: 'Matthew Walker', kind: 'Libro', description: 'Divulgación sobre el sueño y su papel en la memoria, las emociones y la salud.' },
    { title: 'Vivir con plenitud las crisis', author: 'Jon Kabat-Zinn', kind: 'Libro', description: 'El programa de reducción del estrés basado en mindfulness (MBSR), explicado por su creador.' },
    { title: 'Salud mental: fortalecer nuestra respuesta', author: 'Organización Mundial de la Salud', kind: 'Artículo', description: 'Nota descriptiva de la OMS sobre qué es la salud mental y sus determinantes.', url: 'https://www.who.int/es/news-room/fact-sheets/detail/mental-health-strengthening-our-response' },
  ],
  emocional: [
    { title: 'Inteligencia emocional', author: 'Daniel Goleman', kind: 'Libro', description: 'El libro que popularizó el concepto y sus aplicaciones en la vida diaria.' },
    { title: 'Comunicación no violenta', author: 'Marshall B. Rosenberg', kind: 'Libro', description: 'Un método práctico para expresarse con honestidad y escuchar con empatía.' },
    { title: 'Atlas del corazón', author: 'Brené Brown', kind: 'Libro', description: 'Un mapa de 87 emociones y experiencias para ampliar tu vocabulario emocional.' },
  ],
  fisica: [
    { title: 'Directrices sobre actividad física y hábitos sedentarios', author: 'Organización Mundial de la Salud (2020)', kind: 'Guía', description: 'Recomendaciones oficiales de actividad física por grupos de edad.', url: 'https://www.who.int/publications/i/item/9789240015128' },
    { title: 'Hábitos atómicos', author: 'James Clear', kind: 'Libro', description: 'Cómo construir hábitos pequeños que se sostienen en el tiempo.' },
  ],
  alimentacion: [
    { title: 'El Plato para Comer Saludable', author: 'Harvard T.H. Chan School of Public Health', kind: 'Guía', description: 'Guía visual para componer comidas equilibradas.', url: 'https://nutritionsource.hsph.harvard.edu/healthy-eating-plate/' },
    { title: 'Saber comer: 64 reglas básicas', author: 'Michael Pollan', kind: 'Libro', description: 'Reglas sencillas para comer mejor sin obsesionarse.' },
  ],
  digital: [
    { title: 'Minimalismo digital', author: 'Cal Newport', kind: 'Libro', description: 'Una filosofía para usar la tecnología de forma intencional.' },
    { title: 'Superficiales', author: 'Nicholas Carr', kind: 'Libro', description: '¿Qué está haciendo Internet con nuestras mentes? Un ensayo sobre la atención.' },
    { title: 'Cómo no hacer nada', author: 'Jenny Odell', kind: 'Libro', description: 'Resistirse a la economía de la atención y reconectar con el entorno.' },
  ],
  espiritual: [
    { title: 'El hombre en busca de sentido', author: 'Viktor E. Frankl', kind: 'Libro', description: 'Testimonio y reflexión sobre el sentido de la vida en la adversidad.' },
    { title: 'Meditaciones', author: 'Marco Aurelio', kind: 'Libro', description: 'Notas personales de un emperador estoico sobre la virtud y la serenidad.' },
    { title: 'El milagro de mindfulness', author: 'Thich Nhat Hanh', kind: 'Libro', description: 'Introducción sencilla a la atención plena en la vida cotidiana.' },
  ],
};

export const DAILY_TIPS: { pillar: PillarId; text: string }[] = [
  { pillar: 'alimentacion', text: 'Empieza el día con un vaso de agua antes del café.' },
  { pillar: 'digital', text: 'Silencia el móvil durante la próxima comida.' },
  { pillar: 'fisica', text: 'Si hablas por teléfono, hazlo caminando.' },
  { pillar: 'ecologia', text: 'Abre la ventana y observa el cielo un minuto.' },
  { pillar: 'emocional', text: 'Pregunta a alguien «¿cómo estás de verdad?» y escucha la respuesta.' },
  { pillar: 'mental', text: 'Escribe tus tres tareas importantes del día; lo demás puede esperar.' },
  { pillar: 'espiritual', text: 'Antes de dormir, piensa en un momento bonito de hoy.' },
  { pillar: 'fisica', text: 'Levántate y estírate cada vez que termines una tarea.' },
  { pillar: 'alimentacion', text: 'Añade una pieza de fruta de temporada a tu merienda.' },
  { pillar: 'digital', text: 'Mueve las redes sociales fuera de tu pantalla de inicio.' },
  { pillar: 'mental', text: 'Haz tres respiraciones lentas antes de abrir el correo.' },
  { pillar: 'ecologia', text: 'Elige un trayecto corto para hacerlo andando.' },
  { pillar: 'emocional', text: 'Envía un mensaje de agradecimiento concreto.' },
  { pillar: 'espiritual', text: 'Dedica cinco minutos a no hacer nada, solo estar.' },
];

export function tipOfDay(today: Date) {
  const start = new Date(today.getFullYear(), 0, 0).getTime();
  const doy = Math.floor((today.getTime() - start) / 86400000);
  return DAILY_TIPS[doy % DAILY_TIPS.length];
}
