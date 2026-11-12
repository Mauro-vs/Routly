import { Injectable } from '@angular/core';

/*
 * La reserva, preparada para la fase siguiente: la interfaz y nada más. La API aún no tiene
 * /api/bookings (el diseño está en DATABASE.md, sección 14: reservar será una escritura condicional
 * que incrementa seatsBooked de la salida). Cuando exista:
 *   - `available` pasa a true y el botón "Reservar" del detalle se activa solo;
 *   - `reserve` hace POST /api/bookings con la sesión (hará falta iniciar sesión para reservar).
 */

export interface BookingRequest {
  /** La salida elegida (su _id, el que pide la API) */
  departureId: string;
  /** Cuántas plazas */
  seats: number;
  notes?: string;
}

export interface Booking {
  _id: string;
  code: string;
  departureId: string;
  seats: number;
  totalPrice: number;
  state: 'confirmed' | 'cancelled' | 'completed';
}

/** El motivo, para enseñarlo junto al botón mientras no se puede reservar */
export const BOOKING_UNAVAILABLE = 'Las reservas llegan en la próxima versión de Routly: de momento, elige la salida y guarda el enlace.';

@Injectable({ providedIn: 'root' })
export class BookingService {
  /** Si se puede reservar ya */
  readonly available = false;

  reserve(_request: BookingRequest): Promise<Booking> {
    return Promise.reject(new Error(BOOKING_UNAVAILABLE));
  }
}
