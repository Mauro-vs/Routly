import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ApiError, ApiErrorType } from '../../../core/models/api-error.model';
import { ErrorStateComponent } from './error-state.component';

const apiError = (status: number, type: ApiErrorType) => new ApiError({ status, type, message: '' });

describe('ErrorStateComponent', () => {
  async function render(error: ApiError | null) {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
    const fixture = TestBed.createComponent(ErrorStateComponent);
    fixture.componentRef.setInput('title', 'No se han podido cargar los usuarios');
    fixture.componentRef.setInput('error', error);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      text: element.textContent ?? '',
      retry: element.querySelector('button'),
      signIn: element.querySelector('a'),
      icon: element.querySelector('ui-icon')?.getAttribute('ng-reflect-name') ?? element.innerHTML,
    };
  }

  it('sin sesión (401): pide iniciar sesión, con candado y sin "Reintentar"', async () => {
    const { text, retry, icon, signIn } = await render(apiError(401, 'client'));

    expect(signIn?.textContent).toContain('Iniciar sesión');
    expect(signIn?.getAttribute('href')).toContain('/login');
    expect(text).toContain('No se han podido cargar los usuarios');
    expect(text).toContain('Inicia sesión para ver esta sección');
    expect(text).not.toContain('Comprueba que la API está en marcha');
    expect(retry).toBeNull();
    expect(icon).toContain('M208,80H176V56'); // lock-simple
  });

  it('sin permiso (403): lo dice, sin "Reintentar"', async () => {
    const { text, retry, signIn } = await render(apiError(403, 'client'));

    expect(text).toContain('Tu cuenta no tiene permiso para ver esta sección');
    expect(retry).toBeNull();
    expect(signIn).toBeNull();
  });

  it('sin conexión, o sin error conocido: el aviso de siempre, con "Reintentar"', async () => {
    for (const error of [apiError(0, 'network'), null]) {
      TestBed.resetTestingModule();
      const { text, retry } = await render(error);
      expect(text).toContain('Comprueba que la API está en marcha');
      expect(retry?.textContent).toContain('Reintentar');
    }
  });

  it('la API tarda o falla: su propio texto, y se puede reintentar', async () => {
    const timeout = await render(apiError(0, 'timeout'));
    expect(timeout.text).toContain('ha tardado demasiado');
    expect(timeout.retry).not.toBeNull();

    TestBed.resetTestingModule();
    const server = await render(apiError(500, 'server'));
    expect(server.text).toContain('ha fallado al procesar la petición');
    expect(server.retry).not.toBeNull();
  });

  it('"Reintentar" avisa a quien lo usa', async () => {
    const { fixture, retry } = await render(apiError(0, 'network'));
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => retried++);

    retry?.click();
    expect(retried).toBe(1);
  });
});
