import { Injectable, inject, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';

export type ApiStatus = 'checking' | 'online' | 'offline';

/**
 * Estado de la conexión con la API, para el indicador del sidebar.
 * Lo mantiene al día el errorInterceptor con el resultado de cada petición.
 */
@Injectable({ providedIn: 'root' })
export class ApiStatusService {
  private readonly api = inject(ApiService);
  private readonly _status = signal<ApiStatus>('checking');

  readonly status = this._status.asReadonly();
  /** Servidor al que apunta el panel, por ejemplo "localhost:3000". */
  readonly host = new URL(environment.apiUrl).host;

  /** Documentación Swagger de la API (`GET /api/docs`). */
  readonly docsUrl = `${environment.apiUrl}/docs`;

  // /health cuelga de la raíz del servidor, no de /api.
  private readonly healthUrl = new URL('/health', environment.apiUrl).href;

  markOnline(): void {
    this._status.set('online');
  }

  markOffline(): void {
    this._status.set('offline');
  }

  /** Lanza una petición de comprobación. No muestra avisos: basta con el indicador. */
  async check(): Promise<void> {
    this._status.set('checking');
    try {
      await this.api.get<unknown>(this.healthUrl);
    } catch {
      // El interceptor ya ha marcado el estado, salvo cuando la petición caduca.
      if (this._status() === 'checking') this._status.set('offline');
    }
  }
}
