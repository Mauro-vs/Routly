import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthStore } from '../../auth/auth.store';
import { fakeToken, fakeUser } from '../../auth/auth.testing';
import { SessionService } from '../../auth/session.service';
import { NotificationService } from '../../core/services/notification.service';
import { initials } from '../../shared/utils/initials';
import { UserMenuComponent } from './user-menu.component';

describe('UserMenuComponent', () => {
  let fixture: ComponentFixture<UserMenuComponent>;
  let element: HTMLElement;
  let logout: jasmine.Spy;
  let notifications: jasmine.SpyObj<NotificationService>;

  const button = (): HTMLButtonElement => element.querySelector('#user-menu-button') as HTMLButtonElement;
  const menu = (): HTMLElement | null => element.querySelector('[role="menu"]');
  const items = (): HTMLElement[] => Array.from(element.querySelectorAll('[role="menuitem"]'));
  const press = (target: EventTarget, key: string): boolean =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

  beforeEach(async () => {
    localStorage.removeItem('routly.session');
    notifications = jasmine.createSpyObj<NotificationService>('notifications', ['confirm', 'warning']);
    TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    TestBed.inject(AuthStore).login({ token: fakeToken(), user: fakeUser() });
    logout = spyOn(TestBed.inject(SessionService), 'logout').and.resolveTo();
    fixture = TestBed.createComponent(UserMenuComponent);
    element = fixture.nativeElement;
    document.body.appendChild(element);
    await fixture.whenStable();
  });

  afterEach(() => {
    element.remove();
    localStorage.removeItem('routly.session');
  });

  it('el botón dice quién ha entrado y anuncia el menú', () => {
    expect(button().textContent).toContain('Ana');
    expect(button().getAttribute('aria-haspopup')).toBe('menu');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(menu()).toBeNull();
  });

  it('se abre con clic y se cierra con Esc, devolviendo el foco', async () => {
    button().click();
    await fixture.whenStable();
    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(items().length).toBe(4);

    press(document, 'Escape');
    await fixture.whenStable();
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(button());
  });

  it('se cierra al hacer clic fuera', async () => {
    button().click();
    await fixture.whenStable();

    document.body.click();
    await fixture.whenStable();

    expect(menu()).toBeNull();
  });

  it('se maneja con las flechas', async () => {
    press(button(), 'ArrowDown');
    await fixture.whenStable();
    expect(document.activeElement).toBe(items()[0] as HTMLElement);

    press(items()[0] as HTMLElement, 'ArrowUp');
    expect(document.activeElement).toBe(items()[3] as HTMLElement);
  });

  it('"Cerrar sesión" cierra esta sesión', async () => {
    button().click();
    await fixture.whenStable();

    items()[2]?.click();

    expect(logout).toHaveBeenCalledOnceWith();
  });

  it('en todos los dispositivos pide confirmación', async () => {
    notifications.confirm.and.resolveTo(true);
    button().click();
    await fixture.whenStable();

    items()[3]?.click();
    await fixture.whenStable();

    expect(notifications.confirm).toHaveBeenCalled();
    expect(logout).toHaveBeenCalledOnceWith(true);
  });

  it('si no se confirma, no cierra nada', async () => {
    notifications.confirm.and.resolveTo(false);
    button().click();
    await fixture.whenStable();

    items()[3]?.click();
    await fixture.whenStable();

    expect(logout).not.toHaveBeenCalled();
  });
});

describe('initials', () => {
  it('toma la primera y la última palabra', () => {
    expect(initials('Marta Gil Ruiz')).toBe('MR');
    expect(initials('jo')).toBe('J');
    expect(initials('  Ana   Ruiz ')).toBe('AR');
  });

  it('no parte las letras compuestas, y sin nombre da un signo', () => {
    expect(initials('🏍️ Moto')).toBe('🏍️M');
    expect(initials('')).toBe('?');
  });
});
