import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { safeReturnUrl } from '../../core/auth/auth.guards';
import { AuthService } from '../../core/auth/auth.service';
import { authErrorMessage } from './auth-errors';

/** Las reglas de la contraseña en auth (passwordSchema): 8 a 128, con alguna letra y algún número. */
const PASSWORD_PATTERN = /^(?=.*\p{L})(?=.*\d).{8,128}$/u;

/** Crear una cuenta de cliente. auth la da de alta siempre como rider y abre la sesión. */
@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="account-page">
      <div class="account-card">
        <h1>Crear cuenta</h1>
        <p>Un minuto y tienes tu cuenta de rider.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (error()) {
            <p class="form-error" role="alert">{{ error() }}</p>
          }
          <label class="field">
            Nombre
            <input type="text" formControlName="name" autocomplete="name" required [attr.aria-invalid]="invalid('name')" />
          </label>
          <label class="field">
            Correo
            <input type="email" formControlName="email" autocomplete="email" required [attr.aria-invalid]="invalid('email')" />
          </label>
          <label class="field">
            Contraseña
            <input type="password" formControlName="password" autocomplete="new-password" required [attr.aria-invalid]="invalid('password')" aria-describedby="password-hint" />
            <small id="password-hint" [class.field-error]="invalid('password')">Al menos 8 caracteres, con letras y números.</small>
          </label>
          <button class="btn-primary" type="submit" [disabled]="sending()">
            {{ sending() ? 'Creando…' : 'Crear cuenta' }}
          </button>
        </form>

        <p class="account-switch">
          ¿Ya tienes cuenta?
          <a routerLink="/entrar" [queryParams]="volver() ? { volver: volver() } : {}">Entra</a>
        </p>
      </div>
    </section>
  `,
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly volver = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
  });
  protected readonly sending = signal(false);
  protected readonly error = signal('');
  private readonly submitted = signal(false);

  protected invalid(name: 'name' | 'email' | 'password'): boolean {
    return this.submitted() && this.form.controls[name].invalid;
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid || this.sending()) {
      if (this.form.invalid) this.error.set('Revisa los campos marcados.');
      return;
    }

    this.sending.set(true);
    this.error.set('');
    try {
      const { name, email, password } = this.form.getRawValue();
      await this.auth.register({ name: name.trim(), email, password });
      await this.router.navigateByUrl(safeReturnUrl(this.volver()));
    } catch (error) {
      this.error.set(authErrorMessage(error, 'register'));
    } finally {
      this.sending.set(false);
    }
  }
}
