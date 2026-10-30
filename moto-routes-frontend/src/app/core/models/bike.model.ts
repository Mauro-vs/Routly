import { BaseEntity } from './entity.model';
import { ImageSummary } from './image.model';

export type BikeType =
  | 'naked'
  | 'sport'
  | 'touring'
  | 'trail'
  | 'adventure'
  | 'custom'
  | 'enduro'
  | 'scooter'
  | 'classic';

export const BIKE_TYPE_LABELS: Record<BikeType, string> = {
  naked: 'Naked',
  sport: 'Deportiva',
  touring: 'Turismo',
  trail: 'Trail',
  adventure: 'Trail de aventura',
  custom: 'Custom',
  enduro: 'Enduro',
  scooter: 'Scooter',
  classic: 'Clásica',
};

export type ModificationType =
  | 'exhaust'
  | 'suspension'
  | 'brakes'
  | 'ecu'
  | 'luggage'
  | 'tyres'
  | 'ergonomics'
  | 'lighting'
  | 'aesthetics'
  | 'other';

export const MODIFICATION_TYPE_LABELS: Record<ModificationType, string> = {
  exhaust: 'Escape',
  suspension: 'Suspensión',
  brakes: 'Frenos',
  ecu: 'Centralita',
  luggage: 'Equipaje',
  tyres: 'Neumáticos',
  ergonomics: 'Ergonomía',
  lighting: 'Iluminación',
  aesthetics: 'Estética',
  other: 'Otra',
};

/** El carnet que pide. Lo calcula la API: el front lo muestra, nunca lo envía ni lo recalcula. */
export type BikeLicense = 'A1' | 'A2' | 'A';

export interface BikeModification {
  type: ModificationType;
  title: string;
  description?: string;
  /** Solo el día. */
  date?: string;
}

/** Lo que trae de su dueño (`populate`). */
interface BikeOwner {
  _id: string;
  name: string;
  slug: string;
}

/** Una moto del garaje de un usuario. */
export interface Bike extends BaseEntity {
  userId: string;
  user?: BikeOwner | null;
  brand: string;
  model: string;
  version?: string;
  type: BikeType;
  year?: number;
  cc?: number;
  hp?: number;
  torque?: number;
  weight?: number;
  seatHeight?: number;
  km?: number;
  color?: string;
  nickname?: string;
  license: BikeLicense;
  modifications: BikeModification[];
  isPrimary: boolean;
  isPublic: boolean;
  coverImage?: ImageSummary | null;
}

/** La ficha resumida de la moto del guía (`guideBike`). */
export type BikeSummary = Pick<
  Bike,
  '_id' | 'userId' | 'brand' | 'model' | 'version' | 'type' | 'cc' | 'hp' | 'license' | 'slug' | 'coverImage'
> &
  Partial<Pick<Bike, 'nickname'>>;

type Clearable<T> = { [Key in keyof T]?: T[Key] | null };

/** Con `null`, la API vacía el campo. `license` no está: lo calcula ella. */
export interface BikePayload
  extends Clearable<
    Pick<
      Bike,
      'version' | 'year' | 'cc' | 'hp' | 'torque' | 'weight' | 'seatHeight' | 'km' | 'color' | 'nickname'
    >
  > {
  brand: string;
  model: string;
  type: BikeType;
  /** Solo el admin, para dar de alta una moto de otro usuario. */
  userId?: string;
  /** En un PATCH sustituye a la lista entera. */
  modifications?: BikeModification[];
  /** Solo se marca: deja de serlo al marcar otra. */
  isPrimary?: true;
  isPublic?: boolean;
}

// Los mismos límites que src/models/bike.model.js en la API.
export const BIKE_LIMITS = {
  brand: 50,
  model: 80,
  version: 80,
  yearMin: 1900,
  ccMin: 49,
  ccMax: 3000,
  hp: 350,
  torque: 400,
  weightMin: 50,
  weightMax: 500,
  seatHeightMin: 500,
  seatHeightMax: 1100,
  km: 2_000_000,
  color: 40,
  nickname: 40,
  modifications: 30,
  modificationTitle: 80,
  modificationDescription: 500,
  perUser: 10,
} as const;

/** El nombre de una moto: su apodo, o la marca y el modelo. */
export function bikeName(bike: Pick<Bike, 'brand' | 'model'> & Partial<Pick<Bike, 'nickname'>>): string {
  return bike.nickname || `${bike.brand} ${bike.model}`;
}
