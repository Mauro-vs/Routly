import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component } from '@angular/core';

import { AuthStore } from '../../core/auth/auth.store';
import { ReviewsApiService } from '../../core/reviews/reviews-api.service';
import { MyReview } from '../../core/reviews/reviews.models';
import { ReviewsSectionComponent } from './reviews-section.component';
import { page, review } from './testing/reviews.fixtures';

@Component({
  imports: [ReviewsSectionComponent],
  template: `<app-reviews-section type="experience" slug="calas-1" targetId="e1" name="Calas" />`,
})
class HostPage {}

describe('ReviewsSectionComponent', () => {
  let api: jasmine.SpyObj<ReviewsApiService>;
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
    api = jasmine.createSpyObj<ReviewsApiService>('ReviewsApiService', ['list', 'mine', 'remove']);
    api.list.and.callFake(async () => page([review('a', { rating: 4 })]));
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'experiencias/:slug', component: HostPage }]),
        { provide: ReviewsApiService, useValue: api },
        { provide: AuthStore, useValue: { hasSession, isLoggedIn } },
      ],
    });
  });

  it('lee el orden de la URL y enseña la nota y la lista', async () => {
    const { element } = await open();
    expect(api.list.calls.all().some((call) => call.args[2]['sort'] === 'best')).toBeTrue();
    expect(element.querySelector('app-reviews-summary')).not.toBeNull();
    expect(element.querySelectorAll('app-review-item').length).toBe(1);
  });

  it('sin sesión, "Escribir una opinión" lleva a entrar y vuelve aquí', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const { element } = await open();
    const button = [...element.querySelectorAll('button')].find((item) => item.textContent?.includes('Escribir una opinión'));
    button!.click();
    expect(navigate).toHaveBeenCalledWith(['/entrar'], { queryParams: { volver: '/experiencias/calas-1?opiniones=mejores' } });
    expect(api.mine).not.toHaveBeenCalled();
  });

  it('el anfitrión de la experiencia no ve el botón, sino por qué no puede opinar', async () => {
    hasSession.set(true);
    isLoggedIn.set(true);
    const own: MyReview = { review: null, canReview: false, reason: 'OWN_TARGET' };
    api.mine.and.resolveTo(own);
    const { element } = await open();
    expect(element.textContent).not.toContain('Escribir una opinión');
    expect(element.textContent).toContain('no puedes opinar sobre ella');
  });

  it('con opinión propia, sale arriba con "Editar" y "Borrar"', async () => {
    hasSession.set(true);
    isLoggedIn.set(true);
    api.mine.and.resolveTo({ review: review('mia'), canReview: false, reason: 'REVIEW_ALREADY_EXISTS' });
    const { element } = await open();
    const mine = element.querySelector('app-review-item.mine');
    expect(mine?.textContent).toContain('Tu opinión');
    expect(mine?.textContent).toContain('Editar');
    expect(mine?.textContent).toContain('Borrar');
  });
});
