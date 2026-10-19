import { BaseEntity } from './entity.model';
import { HostSummary } from './host.model';

/** Salida guiada que un anfitrión organiza sobre una ruta. */
export interface Experience extends BaseEntity {
  hostId: string;
  host: HostSummary | null;
  routeId: string;
  route: ExperienceRouteSummary | null;
  title: string;
  description?: string;
  meetingPoint?: string;
  /** Código de dos letras: `es`, `en`... */
  language: string;
  /** Horas totales, con paradas. */
  duration: number;
  minParticipants: number;
  maxParticipants: number;
}

/** Lo que trae una experiencia de su ruta (`populate`). */
export interface ExperienceRouteSummary {
  _id: string;
  title: string;
  slug: string;
}

/** Lo que trae una salida de su experiencia (`populate`). */
export type ExperienceSummary = Pick<Experience, '_id' | 'title' | 'slug'>;

export interface ExperiencePayload {
  hostId: string;
  routeId: string;
  title: string;
  description?: string;
  meetingPoint?: string;
  language?: string;
  duration: number;
  minParticipants?: number;
  maxParticipants: number;
}

export const EXPERIENCE_LIMITS = {
  title: 120,
  description: 2000,
  meetingPoint: 200,
  maxParticipants: 100,
} as const;
