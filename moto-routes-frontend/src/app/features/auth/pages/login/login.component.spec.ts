import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthService } from '../../../../auth/auth.service';
import { ApiError } from '../../../../core/models/api-error.model';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let element: HTMLElement;

  const input = (name: string): HTMLInputElement =>
    element.querySelector<HTMLInputElement>(`input[name="${name}"]`) as HTMLInputElement;

  function type(name: string, value: string): void {
    const control = input(name);
    control.value = value;
    control.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('auth', ['login']);
    auth.login.and.resolveTo();
    router = jasmine.createSpyObj<Router>('router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
    fixture = TestBed.createComponent(LoginComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('pide los dos campos, con el autocompletado de un login, y no llama a la API', async () => {
    expect(input('email').autocomplete).toBe('email');
    expect(input('password').autocomplete).toBe('current-password');

    await submit();

    expect(auth.login).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Este campo es obligatorio.');
  });

  it('entra con los datos escritos y va a la portada', async () => {
    type('email', ' ana@routly.dev ');
    type('password', 'clave-1234');

    await submit();

    expect(auth.login).toHaveBeenCalledOnceWith({ email: 'ana@routly.dev', password: 'clave-1234' });
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/');
  });

  it('vuelve a returnUrl si es interna, y nunca a otra web', async () => {
    fixture.componentRef.setInput('returnUrl', '/routes?pagina=2');
    type('email', 'ana@routly.dev');
    type('password', 'clave-1234');
    await submit();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/routes?pagina=2');

    router.navigateByUrl.calls.reset();
    fixture.componentRef.setInput('returnUrl', '//otra.com');
    await submit();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/');
  });

  it('un error de la API se cuenta en una zona role="alert", y se puede reintentar', async () => {
    auth.login.and.rejectWith(
      new ApiError({ status: 401, type: 'client', message: 'El correo o la contraseña no son correctos.' }),
    );
    type('email', 'ana@routly.dev');
    type('password', 'mal');

    await submit();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('no son correctos');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBeFalse();
  });

  it('sin dobles envíos mientras espera la respuesta', async () => {
    let finish: () => void = () => undefined;
    auth.login.and.returnValue(new Promise((resolve) => (finish = () => resolve(null as never))));
    type('email', 'ana@routly.dev');
    type('password', 'clave-1234');

    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBeTrue();
    finish();
    await fixture.whenStable();
  });
});
