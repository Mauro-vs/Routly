import { Bike } from './bike.model';
import { BaseEntity } from './entity.model';
import { ImageSummary } from './image.model';
import { UserSummary } from './user.model';

/** Perfil público de un anfitrión. Su cuenta está en `users` y tiene el rol host. */
export interface Host extends BaseEntity {
  userId: string;
  user: UserSummary | null;
  name: string;
  biography?: string;
  coverImage?: ImageSummary | null;
  /** Su garaje. Solo llega al pedir un anfitrión, no en los listados. */
  bikes?: Bike[];
}

/** Lo que trae una experiencia de su anfitrión (`populate`). */
export type HostSummary = Pick<Host, '_id' | 'name' | 'slug'>;

/** Cuerpo de `POST /api/hosts`. `userId` no se puede cambiar después. */
export interface HostPayload {
  userId: string;
  name: string;
  biography?: string | null;
}

export const HOST_LIMITS = {
  name: 100,
  biography: 1000,
} as const;
