import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, input, signal, Injector } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../auth/auth.service';
import { safeReturnUrl } from '../../../../auth/return-url';
import { toApiError } from '../../../../core/utils/api-error.mapper';
import { BrandMarkComponent } from '../../../../shared/components/brand-mark/brand-mark.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { controlErrorMessage } from '../../../../shared/utils/form-errors';
import { email, notBlank } from '../../../../shared/utils/validators';

function createLoginForm() {
  return new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [notBlank, email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
}

type LoginControl = keyof ReturnType<typeof createLoginForm>['controls'];

/**
 * Inicio de sesión (`/login`). Un error de la API, sea de credenciales, de demasiados intentos
 * o de conexión, se cuenta aquí mismo: la página ya está esperando esa respuesta.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, BrandMarkComponent, FormFieldComponent, IconComponent, InputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="login">
      <div class="card panel login__panel">
        <ui-brand-mark class="login__brand" />
        <h1>Inicia sesión</h1>

        @if (error(); as message) {
          <p class="form-error" role="alert"><ui-icon name="warning-circle" />{{ message }}</p>
        }

        <form class="form-grid" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <ui-form-field label="Correo electrónico" [error]="errorOf('email')">
            <input uiInput type="email" name="email" formControlName="email" autocomplete="email" spellcheck="false" />
          </ui-form-field>
          <ui-form-field label="Contraseña" [error]="errorOf('password')">
            <input uiInput type="password" name="password" formControlName="password" autocomplete="current-password" />
          </ui-form-field>
          <button type="submit" class="btn btn--primary" [disabled]="submitting()">
            {{ submitting() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
      </div>
    </main>
  `,
  styles: `
    .login {
      display: grid;
      place-items: center;
      min-height: 100dvh;
      padding: var(--space-4);
    }

    .login__panel {
      display: grid;
      gap: var(--space-4);
      width: min(100%, 400px);
    }

    .login__brand {
      color: var(--color-primary);
    }

    h1 {
      margin: 0;
      font-size: var(--text-xl);
    }
  `,
})
export class LoginComponent {
  /** Adónde volver. Llega como `?returnUrl=` y se valida antes de usarlo. */
  readonly returnUrl = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly form = createLoginForm();
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly submitted = signal(false);
  // Los formularios reactivos no son signals: este pulso avisa de cada cambio.
  private readonly changes = toSignal(this.form.events);

  protected errorOf(name: LoginControl): string | null {
    this.changes();
    const control = this.form.controls[name];
    return control.touched || this.submitted() ? controlErrorMessage(control) : null;
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) return;

    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    try {
      await this.auth.login({ email: email.trim(), password });
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      this.error.set(toApiError(error).message);
    } finally {
      this.submitting.set(false);
    }
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid')?.focus(),
      { injector: this.injector },
    );
  }
}
