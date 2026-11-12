import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';

import { routes } from './app.routes';
import { timeoutInterceptor } from './core/interceptors/timeout.interceptor';
import { PageMetaStrategy } from './core/services/page-meta.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      // Los parámetros de la URL (:slug) llegan a las páginas como input()
      withComponentInputBinding(),
      // Arriba al cambiar de página; al volver atrás, a donde estaba (el Shop al volver del detalle)
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    // withFetch: al cancelar una suscripción se aborta el fetch (ShopApiService)
    provideHttpClient(withFetch(), withInterceptors([timeoutInterceptor])),
    { provide: TitleStrategy, useExisting: PageMetaStrategy },
  ],
};
