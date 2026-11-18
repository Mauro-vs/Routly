/** El estado de cada pieza del bloque Routly IA: llegan por separado y una que falla no tapa a las demás. */
export type PieceStatus = 'loading' | 'ready' | 'unavailable' | 'error';

export interface Piece<T> {
  status: PieceStatus;
  data: T | null;
}

export const LOADING: Piece<never> = { status: 'loading', data: null };
