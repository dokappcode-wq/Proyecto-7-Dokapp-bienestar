// Modelo de datos de Dokapp. Refleja 1:1 las tablas de supabase/schema.sql.

export type PillarId =
  | 'ecologia'
  | 'mental'
  | 'emocional'
  | 'fisica'
  | 'alimentacion'
  | 'digital'
  | 'espiritual';

export type EmotionId = 'triste' | 'enfadado' | 'feliz' | 'motivado' | 'cansado';

/** public: feed de seguidores · groups: solo grupos elegidos · private: solo calendario. */
export type Visibility = 'public' | 'groups' | 'private';

export interface Profile {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatar: string; // url, "scene:<id>" o "" (iniciales)
  isPublic: boolean;
  interests: PillarId[];
  onboarded: boolean;
  createdAt: string;
  /** Consentimiento para mostrar métricas propias a los grupos. */
  shareMetricsWithGroups: boolean;
}

export interface WellnessAction {
  id: string;
  userId: string;
  photo: string; // "scene:<id>", "idb:<id>" o url
  pillar: PillarId;
  description: string;
  /** Solo presente para el autor, o si este ha decidido compartirla. */
  emotion: EmotionId | null;
  reflection: string;
  shareEmotion: boolean;
  visibility: Visibility;
  groupIds: string[];
  allowComments: boolean;
  createdAt: string; // fecha de registro en Dokapp
  originalTakenAt: string | null; // fecha EXIF de la foto importada, si el usuario lo permite
}

export interface Follow {
  followerId: string;
  followingId: string;
  status: 'accepted' | 'pending';
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  image: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  /** Objetivo común: acciones semanales del grupo. */
  weeklyGoal: number;
  /** Días de la semana (0=domingo) que cuentan como descanso para todo el grupo. */
  restWeekdays: number[];
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  /** Pausa justificada (YYYY-MM-DD, ambos incluidos): el miembro no cuenta para la racha mientras dure. */
  pauseFrom: string | null;
  pauseUntil: string | null;
  pauseReason: string;
  shareMetrics: boolean;
}

/** Actividad diaria agregada (sin contenido) que alimenta la racha de grupo. */
export interface GroupActivity {
  groupId: string;
  userId: string;
  day: string; // YYYY-MM-DD
  count: number;
  pillars: PillarId[];
  /** Día de descanso personal: no rompe la racha del grupo. */
  rest: boolean;
}

export interface Reaction {
  actionId: string;
  userId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  actionId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  pillar: PillarId;
  /** Veces por semana (frequency=weekly) o por día (daily). */
  target: number;
  frequency: 'daily' | 'weekly';
  startDate: string;
  endDate: string | null;
  /** Días (YYYY-MM-DD) marcados como cumplidos manualmente. */
  checkins: string[];
  archived: boolean;
}

export interface LessonProgress {
  lessonId: string;
  completedAt: string;
  xp: number;
  score: number; // aciertos / preguntas
}

export interface JournalEntry {
  id: string;
  prompt: string;
  text: string;
  pillar: PillarId;
  createdAt: string;
}

export interface RestDay {
  day: string;
  reason: string;
}

export interface ScoringWeights {
  frequency: number;
  consistency: number;
  goals: number;
  reflection: number;
  /** Acciones por semana por pilar que se consideran el 100 % de frecuencia. */
  weeklyTargetPerPillar: number;
}

export interface Settings {
  weights: ScoringWeights;
  remindersEnabled: boolean;
  keepOriginalPhotoDate: boolean;
}

/** Todo lo que la sesión actual puede ver. El backend aplica la privacidad al construirlo. */
export interface Snapshot {
  me: Profile;
  profiles: Profile[];
  actions: WellnessAction[];
  follows: Follow[];
  groups: Group[];
  members: GroupMember[];
  groupActivity: GroupActivity[];
  reactions: Reaction[];
  comments: Comment[];
  goals: Goal[];
  lessons: LessonProgress[];
  journal: JournalEntry[];
  restDays: RestDay[];
  settings: Settings;
}

export interface NewActionInput {
  photo: Blob | string;
  pillar: PillarId;
  description: string;
  emotion: EmotionId | null;
  reflection: string;
  shareEmotion: boolean;
  visibility: Visibility;
  groupIds: string[];
  allowComments: boolean;
  originalTakenAt: string | null;
}
