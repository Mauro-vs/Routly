import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  let login: jasmine.Spy;

  function render(volver?: string) {
    login = jasmine.createSpy('login');
    TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: AuthService, useValue: { login } }],
    });
    const fixture = TestBed.createComponent(LoginPageComponent);
    if (volver) fixture.componentRef.setInput('volver', volver);
    fixture.detectChanges();
    return fixture;
  }

  function fill(element: HTMLElement, email: string, password: string): void {
    const [emailInput, passwordInput] = element.querySelectorAll('input');
    emailInput.value = email;
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input'));
  }

  const submit = async (fixture: ReturnType<typeof render>) => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('vacío no llama a auth y lo dice', async () => {
    const fixture = render();
    await submit(fixture);
    expect(login).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('correo y tu contraseña');
  });

  it('entra y vuelve a donde iba', async () => {
    const fixture = render('/experiencias/ruta-1');
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    login.and.resolveTo({ id: 'u1' });

    fill(fixture.nativeElement, 'lucia@routly.dev', 'secreta-1');
    await submit(fixture);

    expect(login).toHaveBeenCalledWith({ email: 'lucia@routly.dev', password: 'secreta-1' });
    expect(navigate).toHaveBeenCalledWith('/experiencias/ruta-1');
  });

  it('con un 401, el mismo mensaje para correo o contraseña', async () => {
    const fixture = render();
    login.and.rejectWith(new HttpErrorResponse({ status: 401 }));

    fill(fixture.nativeElement, 'lucia@routly.dev', 'mal-1234');
    await submit(fixture);

    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('El correo o la contraseña no son correctos');
  });
});
