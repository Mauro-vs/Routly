import { Injectable } from '@angular/core';

import { Bike, BikePayload } from '../../../core/models/bike.model';
import { User } from '../../../core/models/user.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/bikes`. Los endpoints comunes vienen de EntityApiService.
 *
 * Además, los usuarios activos para el select del admin: una moto es de quien la crea, y
 * solo él puede darla de alta a nombre de otro.
 */
@Injectable({ providedIn: 'root' })
export class BikesService extends EntityApiService<Bike, BikePayload> {
  protected readonly path = '/bikes';

  getOwnerOptions(): Promise<User[]> {
    return this.api.get<User[]>('/users/actives');
  }
}

/** Mi garaje: lo mismo, pero el listado son las motos del usuario de la sesión, también las privadas. */
@Injectable({ providedIn: 'root' })
export class GarageService extends BikesService {
  override getAll(): Promise<Bike[]> {
    return this.api.get<Bike[]>('/profile/me/bikes');
  }
}
