import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AiApiService } from '../../core/ai/ai-api.service';
import { ShopHostDetail } from '../../core/api/shop.models';
import { ReviewsApiService } from '../../core/reviews/reviews-api.service';
import { GuidePageComponent } from './guide-page.component';

const pending = (): Promise<never> => new Promise<never>(() => undefined);

const GUIDE: ShopHostDetail = {
  _id: 'h1',
  name: 'Lucía Ferrer',
  slug: 'lucia-ferrer-1',
  biography: 'Guía en Mallorca desde 2015.',
  coverImage: null,
  rating: { average: 4.8, count: 12, distribution: {} },
  experiencesRating: { average: 4.5, count: 40, distribution: {} },
  experiences: [],
};

describe('GuidePageComponent', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'guias/:slug', component: GuidePageComponent }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ReviewsApiService, useValue: { list: pending, mine: pending } },
        { provide: AiApiService, useValue: { reviewsSummary: pending } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function open(flush: (http: HttpTestingController) => void): Promise<HTMLElement> {
    await harness.navigateByUrl('/guias/lucia-ferrer-1');
    flush(http);
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  it('enseña sus dos notas: como guía y en sus experiencias, y sus opiniones', async () => {
    const element = await open((http) => http.expectOne('/api/shop/hosts/lucia-ferrer-1').flush({ data: GUIDE }));
    const scores = [...element.querySelectorAll('.scores li')].map((item) => item.textContent?.replace(/\s+/g, ' ').trim());
    expect(scores[0]).toContain('4,8');
    expect(scores[0]).toContain('como guía · 12 opiniones');
    expect(scores[1]).toContain('4,5');
    expect(scores[1]).toContain('en sus experiencias · 40 opiniones');
    expect(element.querySelector('app-reviews-section')).not.toBeNull();
    // Con el resumen IA de sus opiniones encima de la lista
    expect(element.querySelector('app-reviews-section app-reviews-ai-summary')).not.toBeNull();
  });

  it('un guía que no existe queda como no encontrado', async () => {
    const element = await open((http) =>
      http.expectOne('/api/shop/hosts/lucia-ferrer-1').flush(null, { status: 404, statusText: 'Not Found' }),
    );
    expect(element.querySelector('h1')?.textContent).toContain('No hemos encontrado a este guía');
  });
});
