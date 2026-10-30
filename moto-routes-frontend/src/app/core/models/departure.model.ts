import { BikeSummary } from './bike.model';
import { BaseEntity } from './entity.model';
import { ExperienceSummary } from './experience.model';

/** Lo que pasa en el mundo real. Es independiente de `status` (si se muestra en el panel). */
export type DepartureState = 'scheduled' | 'cancelled' | 'completed';

/** Fecha concreta en la que sale una experiencia. */
export interface Departure extends BaseEntity {
  experienceId: string;
  experience: ExperienceSummary | null;
  /** ISO 8601. */
  startAt: string;
  endAt: string;
  capacity: number;
  /** Euros por persona. */
  price: number;
  state: DepartureState;
  /**
   * Código comercial fijo, por ejemplo `RTL-DEP-261108-7QX2M`. Lo genera la API y no
   * cambia nunca, aunque cambie la fecha. El slug, en cambio, sí sigue a la fecha.
   */
  sku: string;
  /** La moto propia de esta salida. Sin ella, hereda la de la experiencia. */
  guideBikeId?: string | null;
  /** La que lleva de verdad: la propia o la heredada. */
  guideBike?: BikeSummary | null;
}

/** Cuerpo de `POST /api/departures`. En el PATCH no se puede cambiar `experienceId`. */
export interface DeparturePayload {
  experienceId: string;
  startAt: string;
  endAt: string;
  capacity: number;
  price: number;
  state?: DepartureState;
  guideBikeId?: string | null;
}

/** Los mismos límites que la API (DEPARTURE_LIMITS en departure.model.js). Euros por persona. */
export const DEPARTURE_LIMITS = {
  price: 100000,
} as const;

export const DEPARTURE_STATE_LABELS: Record<DepartureState, string> = {
  scheduled: 'Programada',
  cancelled: 'Cancelada',
  completed: 'Realizada',
};
