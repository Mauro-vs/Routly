import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { safeReturnUrl } from '../../core/auth/auth.guards';
import { AuthService } from '../../core/auth/auth.service';
import { authErrorMessage } from './auth-errors';

/** Entrar como cliente (o admin). Al terminar, vuelve a donde iba (`?volver=`) o a Mi cuenta. */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="account-page">
      <div class="account-card">
        <h1>Entrar</h1>
        <p>Con tu cuenta de Routly ves tus datos y, pronto, tus reservas.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (error()) {
            <p class="form-error" role="alert">{{ error() }}</p>
          }
          <label class="field">
            Correo
            <input type="email" formControlName="email" autocomplete="email" required [attr.aria-invalid]="invalid('email')" />
          </label>
          <label class="field">
            Contraseña
            <input type="password" formControlName="password" autocomplete="current-password" required [attr.aria-invalid]="invalid('password')" />
          </label>
          <button class="btn-primary" type="submit" [disabled]="sending()">
            {{ sending() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <p class="account-switch">
          ¿Aún no tienes cuenta?
          <a routerLink="/registro" [queryParams]="volver() ? { volver: volver() } : {}">Regístrate</a>
        </p>
      </div>
    </section>
  `,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** ?volver= de la URL (withComponentInputBinding) */
  readonly volver = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly sending = signal(false);
  protected readonly error = signal('');
  private readonly submitted = signal(false);

  protected invalid(name: 'email' | 'password'): boolean {
    return this.submitted() && this.form.controls[name].invalid;
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid || this.sending()) {
      if (this.form.invalid) this.error.set('Escribe tu correo y tu contraseña.');
      return;
    }

    this.sending.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.form.getRawValue());
      await this.router.navigateByUrl(safeReturnUrl(this.volver()));
    } catch (error) {
      this.error.set(authErrorMessage(error, 'login'));
    } finally {
      this.sending.set(false);
    }
  }
}
