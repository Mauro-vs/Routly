import { Injectable } from '@angular/core';

import { Location, LocationPayload } from '../../../core/models/location.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/locations`. Los endpoints comunes vienen de EntityApiService.
 */
@Injectable({ providedIn: 'root' })
export class LocationsService extends EntityApiService<Location, LocationPayload> {
  protected readonly path = '/locations';
}
