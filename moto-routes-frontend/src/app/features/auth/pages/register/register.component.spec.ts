import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../../../../auth/auth.service';
import { ApiError } from '../../../../core/models/api-error.model';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let navigateByUrl: jasmine.Spy;
  let element: HTMLElement;

  const input = (name: string): HTMLInputElement =>
    element.querySelector<HTMLInputElement>(`input[name="${name}"]`) as HTMLInputElement;

  function type(name: string, value: string): void {
    const control = input(name);
    control.value = value;
    control.dispatchEvent(new Event('input'));
  }

  function fillValid(): void {
    type('name', ' Marta Gil ');
    type('email', ' marta@routly.dev ');
    type('password', 'clave-segura-1');
    type('repeat', 'clave-segura-1');
  }

  async function submit(): Promise<void> {
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('auth', ['register']);
    auth.register.and.resolveTo();

    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    });
    navigateByUrl = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(RegisterComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('crea la cuenta con los datos escritos, sin la repetición, y entra', async () => {
    fillValid();

    await submit();

    expect(auth.register).toHaveBeenCalledOnceWith({
      name: 'Marta Gil',
      email: 'marta@routly.dev',
      password: 'clave-segura-1',
    });
    expect(navigateByUrl).toHaveBeenCalledOnceWith('/');
  });

  it('usa el autocompletado de una cuenta nueva', () => {
    expect(input('password').autocomplete).toBe('new-password');
    expect(input('repeat').autocomplete).toBe('new-password');
  });

  it('las reglas de la contraseña se marcan mientras se escribe', async () => {
    const met = (): number => element.querySelectorAll('.rules li.is-met').length;
    expect(met()).toBe(0);

    type('password', 'abcdefgh');
    await fixture.whenStable();
    expect(met()).toBe(1);

    type('password', 'abcdefg1');
    await fixture.whenStable();
    expect(met()).toBe(2);
  });

  it('no envía si las contraseñas no coinciden, y lo dice', async () => {
    fillValid();
    type('repeat', 'otra-clave-22');

    await submit();

    expect(auth.register).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Las contraseñas no coinciden.');
  });

  it('un correo ya en uso se marca en su campo', async () => {
    auth.register.and.rejectWith(
      new ApiError({ status: 409, type: 'client', message: 'Ya existe un usuario con ese email.' }),
    );
    fillValid();

    await submit();

    expect(input('email').getAttribute('aria-invalid')).toBe('true');
    expect(element.textContent).toContain('Ya existe un usuario con ese email.');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('un error de conexión va en la zona role="alert"', async () => {
    auth.register.and.rejectWith(new ApiError({ status: 0, type: 'network', message: 'Sin conexión.' }));
    fillValid();

    await submit();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Sin conexión.');
  });
});
