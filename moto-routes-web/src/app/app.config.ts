import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
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
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
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
    // withFetch: HttpClient usa fetch por debajo (ApiService).
    // authInterceptor primero: manda las cookies y, con un 401, renueva la sesión y repite la
    // petición, que vuelve a pasar por el timeout
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, timeoutInterceptor])),
    // Arranca la sesión del cliente (si la hay) sin esperar: la web pública no la necesita para pintarse
    provideAppInitializer(() => void inject(AuthService)),
    { provide: TitleStrategy, useExisting: PageMetaStrategy },
  ],
};
