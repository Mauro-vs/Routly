import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Experience } from '../../../../core/models/experience.model';
import { environment } from '../../../../../environments/environment';
import { ExperienceFormPageComponent } from './experience-form-page.component';

const API = environment.apiUrl;

const EXPERIENCE: Experience = {
  _id: 'e1',
  slug: 'pirineo',
  title: 'Pirineo',
  hostId: 'h1',
  host: { _id: 'h1', name: 'Pirineos Adventure', slug: 'pirineos' },
  routeId: 'r1',
  route: { _id: 'r1', title: 'Puertos', slug: 'puertos' },
  language: 'es',
  duration: 8,
  minParticipants: 2,
  maxParticipants: 8,
  status: 'active',
  isActive: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as Experience;

/** Deja que se resuelvan las promesas y los efectos pendientes. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve));
};

describe('ExperienceFormPageComponent', () => {
  it('pide las motos del anfitrión una sola vez, sin entrar en bucle', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ExperienceFormPageComponent);
    fixture.componentRef.setInput('slug', 'pirineo');

    let hostRequests = 0;
    // Responde a todo lo que llegue mientras haya peticiones: un bucle no se acabaría nunca.
    for (let round = 0; round < 10; round++) {
      await fixture.whenStable();
      await settle();
      const pending = http.match(() => true);
      if (!pending.length) break;
      for (const request of pending) {
        const url = request.request.url;
        if (url === `${API}/hosts/h1`) {
          hostRequests++;
          request.flush({ ...EXPERIENCE.host, bikes: [] });
        } else if (url.includes('/experiences/')) {
          request.flush(EXPERIENCE);
        } else {
          request.flush([]);
        }
      }
    }

    expect(hostRequests).toBe(1);
    http.verify();
  });
});
