import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { DashboardService } from './dashboard.service';

const BASE = environment.apiUrl;

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide el listado de rutas y el de salidas', async () => {
    const routes = service.getRoutes();
    http.expectOne({ method: 'GET', url: `${BASE}/routes` }).flush([]);
    expect(await routes).toEqual([]);

    const departures = service.getDepartures();
    http.expectOne({ method: 'GET', url: `${BASE}/departures` }).flush([]);
    expect(await departures).toEqual([]);
  });
});
