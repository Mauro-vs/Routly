/*
 * Lo que devuelve /api/shop (el contrato está en "La parte pública" del README de la API).
 * Solo los campos que usa la web: la API manda más (status, createdAt...) y se ignoran.
 */

export interface ShopImage {
  _id: string;
  url: string;
  alt?: string | null;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

/** Una tarjeta de carrusel: categoría, anfitrión o ubicación, con cuántas experiencias tiene. */
interface ShopFacet {
  _id: string;
  slug: string;
  experienceCount: number;
  coverImage: ShopImage | null;
}

export interface ShopCategory extends ShopFacet {
  name: string;
  description?: string | null;
}

export interface ShopHost extends ShopFacet {
  name: string;
  biography?: string | null;
}

export interface ShopLocation extends ShopFacet {
  city: string;
  region?: string | null;
  country: string;
}

export interface ShopPlace {
  _id: string;
  slug: string;
  city: string;
  region?: string | null;
  country: string;
}

export interface ShopRoute {
  _id: string;
  title: string;
  slug: string;
  /** Kilómetros */
  distance: number;
  /** Horas de conducción */
  duration: number;
  difficulty: Difficulty;
  category: { _id: string; name: string; slug: string } | null;
  startLocation: ShopPlace | null;
  endLocation: ShopPlace | null;
}

export interface GuideBike {
  _id: string;
  brand: string;
  model: string;
  version?: string | null;
  type?: string | null;
  license?: string | null;
}

/** Una experiencia del Shop: todo lo que necesita su tarjeta. */
export interface ShopExperience {
  _id: string;
  title: string;
  slug: string;
  description?: string | null;
  meetingPoint?: string | null;
  language: string;
  /** Horas que dura la salida guiada */
  duration: number;
  minParticipants: number;
  maxParticipants: number;
  host: { _id: string; name: string; slug: string } | null;
  route: ShopRoute | null;
  guideBike: GuideBike | null;
  coverImage: ShopImage | null;
  /** El precio más bajo de sus salidas reservables, o null si no tiene */
  priceFrom: number | null;
  /** La fecha de su próxima salida reservable, o null */
  nextDepartureAt: string | null;
}

/** El detalle: además, el anfitrión entero y la galería, por posición. */
export interface ShopExperienceDetail extends Omit<ShopExperience, 'host'> {
  host: (ShopHost & { user?: { _id: string; name: string } }) | null;
  images: ShopImage[];
}

export type DepartureState = 'scheduled' | 'cancelled' | 'completed';

export interface ShopDeparture {
  _id: string;
  slug: string;
  sku: string;
  startAt: string;
  endAt: string;
  capacity: number;
  /** Euros por persona */
  price: number;
  state: DepartureState;
  seatsBooked: number;
  seatsLeft: number;
  isFull: boolean;
}

export interface ShopPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ShopPage<T> {
  data: T[];
  pagination: ShopPagination;
}
