import { Injectable, inject } from '@angular/core';

import { Departure } from '../../../core/models/departure.model';
import { Route } from '../../../core/models/route.model';
import { ApiService } from '../../../core/services/api.service';

/**
 * Llamadas del Dashboard: los listados de rutas y de salidas, con los que DashboardStore
 * calcula las cifras (la API no tiene un endpoint de estadísticas). Se piden aquí y no
 * desde sus features, porque una feature no importa de otra.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  getRoutes(): Promise<Route[]> {
    return this.api.get<Route[]>('/routes');
  }

  getDepartures(): Promise<Departure[]> {
    return this.api.get<Departure[]>('/departures');
  }
}
