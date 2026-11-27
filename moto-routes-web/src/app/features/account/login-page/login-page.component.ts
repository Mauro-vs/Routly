import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { safeReturnUrl } from '../../../core/auth/auth.guards';
import { AuthService } from '../../../core/auth/auth.service';
import { authErrorMessage } from '../auth-errors';

/** Entrar como cliente (o admin). Al terminar, vuelve a donde iba (`?volver=`) o a Mi cuenta. */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.component.html',
  styleUrl: '../account.css',
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
