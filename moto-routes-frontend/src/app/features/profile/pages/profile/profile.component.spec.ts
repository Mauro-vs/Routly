import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { AuthStore } from '../../../../auth/auth.store';
import { fakeToken, fakeUser } from '../../../../auth/auth.testing';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProfileComponent } from './profile.component';

const BASE = environment.apiUrl;

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let element: HTMLElement;
  let http: HttpTestingController;
  let store: AuthStore;
  let notifications: jasmine.SpyObj<NotificationService>;

  const input = (name: string): HTMLInputElement =>
    element.querySelector<HTMLInputElement>(`[name="${name}"]`) as HTMLInputElement;

  function type(name: string, value: string): void {
    const control = input(name);
    control.value = value;
    control.dispatchEvent(new Event('input'));
  }

  const forms = (): (Element | null)[] => [
    element.querySelector('#profile-form'),
    element.querySelector('form:has([name="currentPassword"])'),
  ];

  async function submit(index: number): Promise<void> {
    forms()[index]?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.removeItem('routly.session');
    notifications = jasmine.createSpyObj<NotificationService>('notifications', ['success', 'errorToast', 'error', 'warning']);
    notifications.success.and.resolveTo();

    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    store = TestBed.inject(AuthStore);
    store.login({
      token: fakeToken(),
      user: { ...fakeUser('rider'), profile: { city: 'Logroño', phone: '+34600111222' } },
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProfileComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
    http.match(() => true).forEach((request) => request.flush([]));
    await settle();
  });

  afterEach(() => localStorage.removeItem('routly.session'));

  it('muestra los datos del usuario de la sesión', () => {
    expect(element.querySelector('h1')?.textContent).toContain('Ana');
    expect(input('email').value).toBe('ana@routly.dev');
    expect(input('city').value).toBe('Logroño');
  });

  it('al guardar actualiza el usuario del store, y un campo vaciado va como null', async () => {
    type('name', 'Ana Ruiz');
    type('city', '');

    await submit(0);

    const request = http.expectOne({ method: 'PATCH', url: `${BASE}/profile/me` });
    expect(request.request.body).toEqual({
      name: 'Ana Ruiz',
      email: 'ana@routly.dev',
      profile: { phone: '+34600111222', city: null },
    });
    request.flush({ ...fakeUser('rider'), name: 'Ana Ruiz' });
    await settle();

    expect(store.user()?.name).toBe('Ana Ruiz');
    expect(notifications.success).toHaveBeenCalledWith('Cambios guardados.');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
  });

  it('avisa de cambios sin guardar', () => {
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    input('name').dispatchEvent(new Event('input'));
    type('name', 'Otra');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });

  it('un teléfono sin prefijo no se envía', async () => {
    type('phone', '600111222');

    await submit(0);

    http.expectNone(`${BASE}/profile/me`);
    expect(element.textContent).toContain('formato internacional');
  });

  it('un correo en uso se marca en su campo', async () => {
    await submit(0);

    http
      .expectOne(`${BASE}/profile/me`)
      .flush({ message: 'A user with this email already exists' }, { status: 409, statusText: 'Conflict' });
    await settle();

    expect(input('email').getAttribute('aria-invalid')).toBe('true');
  });

  it('cambiar la contraseña guarda el token nuevo', async () => {
    const token = fakeToken(7200);
    type('currentPassword', 'clave-vieja-1');
    type('newPassword', 'clave-nueva-2');
    type('repeat', 'clave-nueva-2');

    await submit(1);

    const request = http.expectOne({ method: 'PATCH', url: `${BASE}/profile/me/password` });
    expect(request.request.body).toEqual({ currentPassword: 'clave-vieja-1', newPassword: 'clave-nueva-2' });
    request.flush({ token, tokenType: 'Bearer', expiresIn: 7200, user: fakeUser('rider') });
    await settle();

    expect(store.token()).toBe(token);
    expect(input('newPassword').value).toBe('');
  });

  it('las contraseñas tienen que coincidir', async () => {
    type('currentPassword', 'clave-vieja-1');
    type('newPassword', 'clave-nueva-2');
    type('repeat', 'otra-clave-3');

    await submit(1);

    http.expectNone(`${BASE}/profile/me/password`);
    expect(element.textContent).toContain('Las contraseñas no coinciden.');
  });

  it('la contraseña actual incorrecta se marca en su campo', async () => {
    type('currentPassword', 'mal-mal-11');
    type('newPassword', 'clave-nueva-2');
    type('repeat', 'clave-nueva-2');

    await submit(1);

    http.expectOne(`${BASE}/profile/me/password`).flush(
      { message: 'Validation failed', details: [{ field: 'currentPassword', message: 'currentPassword is incorrect' }] },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle();

    expect(input('currentPassword').getAttribute('aria-invalid')).toBe('true');
    expect(element.textContent).toContain('La contraseña actual no es correcta.');
  });
});
