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
import { authInterceptor } from './auth/auth.interceptor';
import { AuthService } from './auth/auth.service';
import { SessionService } from './auth/session.service';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { timeoutInterceptor } from './core/interceptors/timeout.interceptor';
import { PageTitleStrategy } from './core/services/page-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      // Los parámetros de la URL (como :slug) y `data` llegan a las páginas como input().
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(
      withFetch(),
      // El orden importa: errorInterceptor va primero para ver también el corte del
      // timeoutInterceptor, y authInterceptor el último, pegado a la petición.
      withInterceptors([errorInterceptor, timeoutInterceptor, authInterceptor]),
    ),
    { provide: TitleStrategy, useExisting: PageTitleStrategy },
    // La sesión se valida antes de la primera navegación: así los guards ya conocen el rol.
    provideAppInitializer(() => {
      inject(SessionService);
      return inject(AuthService).loadSession();
    }),
  ],
};
