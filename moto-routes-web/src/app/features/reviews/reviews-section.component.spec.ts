import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AuthStore } from '../../core/auth/auth.store';
import { ApiService } from '../../core/api/api.service';
import { MyReview } from './reviews.models';
import { ReviewsSectionComponent } from './reviews-section.component';
import { page, review } from './testing/reviews.fixtures';

@Component({
  imports: [ReviewsSectionComponent],
  template: `<app-reviews-section type="experience" slug="calas-1" targetId="e1" name="Calas" />`,
})
class HostPage {}

describe('ReviewsSectionComponent', () => {
  let api: jasmine.SpyObj<ApiService>;
  let mine: MyReview | null;
  const hasSession = signal(false);
  const isLoggedIn = signal(false);

  async function open(): Promise<{ element: HTMLElement; harness: RouterTestingHarness }> {
    const harness = await RouterTestingHarness.create('/experiencias/calas-1?opiniones=mejores');
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    return { element: harness.routeNativeElement as HTMLElement, harness };
  }

  beforeEach(() => {
    hasSession.set(false);
    isLoggedIn.set(false);
    mine = null;
    // La sección pide por su store, y el store por ApiService: lo de "la mía" y la lista, según la URL
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'patch']);
    api.get.and.callFake((async (url: string) => {
      if (url.endsWith('/mine')) return { data: mine };
      return page([review('a', { rating: 4 })]);
    }) as never);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'experiencias/:slug', component: HostPage }]),
        { provide: ApiService, useValue: api },
        { provide: AuthStore, useValue: { hasSession, isLoggedIn } },
      ],
    });
  });

  it('lee el orden de la URL y enseña la nota y la lista', async () => {
    const { element } = await open();
    expect(api.get.calls.all().some((call) => call.args[1]?.['sort'] === 'best')).toBeTrue();
    expect(element.querySelector('app-reviews-summary')).not.toBeNull();
    expect(element.querySelectorAll('app-review-item').length).toBe(1);
  });

  it('sin sesión, "Escribir una opinión" lleva a entrar y vuelve aquí', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const { element } = await open();
    const button = [...element.querySelectorAll('button')].find((item) => item.textContent?.includes('Escribir una opinión'));
    button!.click();
    expect(navigate).toHaveBeenCalledWith(['/entrar'], { queryParams: { volver: '/experiencias/calas-1?opiniones=mejores' } });
    expect(api.get.calls.all().some((call) => call.args[0].endsWith('/mine'))).toBeFalse();
  });

  it('el anfitrión de la experiencia no ve el botón, sino por qué no puede opinar', async () => {
    hasSession.set(true);
    isLoggedIn.set(true);
    mine = { review: null, canReview: false, reason: 'OWN_TARGET' };
    const { element } = await open();
    expect(element.textContent).not.toContain('Escribir una opinión');
    expect(element.textContent).toContain('no puedes opinar sobre ella');
  });

  it('con opinión propia, sale arriba con "Editar" y "Borrar"', async () => {
    hasSession.set(true);
    isLoggedIn.set(true);
    mine = { review: review('mia'), canReview: false, reason: 'REVIEW_ALREADY_EXISTS' };
    const { element } = await open();
    const item = element.querySelector('app-review-item.mine');
    expect(item?.textContent).toContain('Tu opinión');
    expect(item?.textContent).toContain('Editar');
    expect(item?.textContent).toContain('Borrar');
  });
});
