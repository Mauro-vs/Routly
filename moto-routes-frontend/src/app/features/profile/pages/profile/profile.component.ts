import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { AuthStore } from '../../../../auth/auth.store';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { USER_LIMITS } from '../../../../core/models/user.model';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { PasswordRevealComponent } from '../../../../shared/components/form-field/password-reveal.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  ProfileFieldsComponent,
  createProfileGroup,
  fillProfileGroup,
  profilePayload,
} from '../../../../shared/components/profile-fields/profile-fields.component';
import { formatDate } from '../../../../shared/utils/format';
import { applyServerErrors, controlErrorMessage } from '../../../../shared/utils/form-errors';
import { email, letterAndNumber, minTrimmed, notBlank } from '../../../../shared/utils/validators';
import { ProfileService } from '../../services/profile.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('newPassword')?.value === group.get('repeat')?.value ? null : { mismatch: true };
}

function createAccountForm() {
  return new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, minTrimmed(2), Validators.maxLength(USER_LIMITS.name)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, email, Validators.maxLength(USER_LIMITS.email)],
    }),
    profile: createProfileGroup(),
  });
}

function createPasswordForm() {
  return new FormGroup(
    {
      currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(USER_LIMITS.passwordMin),
          Validators.maxLength(USER_LIMITS.passwordMax),
          letterAndNumber,
        ],
      }),
      repeat: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordsMatch },
  );
}

/**
 * Mi perfil (`/profile`): siempre el del usuario de la sesión. Sus datos, su foto y su
 * contraseña, que se guarda aparte porque cambia el token.
 */
@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    IconComponent,
    ImageGalleryComponent,
    InputDirective,
    PageHeaderComponent,
    PasswordRevealComponent,
    ProfileFieldsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (user(); as user) {
      <ui-page-header [title]="user.name" [subtitle]="subtitle()">
        <button type="submit" form="profile-form" class="btn btn--primary" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner" aria-hidden="true"></span>Guardando…
          } @else {
            <ui-icon name="check" />Guardar cambios
          }
        </button>
      </ui-page-header>

      <div class="layout">
        <div class="layout__main">
          <form id="profile-form" class="card panel form-grid" [formGroup]="account" (ngSubmit)="save()" novalidate>
            <h2>Tus datos</h2>
            @if (accountError(); as message) {
              <p class="form-error" role="alert"><ui-icon name="warning-circle" />{{ message }}</p>
            }
            <div class="form-row">
              <ui-form-field label="Nombre" [error]="accountErrorOf('name')">
                <input uiInput type="text" name="name" formControlName="name" autocomplete="name" />
              </ui-form-field>
              <ui-form-field label="Correo electrónico" [error]="accountErrorOf('email')">
                <input uiInput type="email" name="email" formControlName="email" autocomplete="email" spellcheck="false" />
              </ui-form-field>
            </div>
            <ui-profile-fields [group]="account.controls.profile" [submitted]="accountSubmitted()" />
          </form>

          <app-image-gallery ownerType="user" [ownerId]="user._id" [ownerLabel]="user.name" />
        </div>

        <aside class="layout__aside">
          <form class="card panel form-grid" [formGroup]="password" (ngSubmit)="changePassword()" novalidate>
            <h2>Contraseña</h2>
            @if (passwordError(); as message) {
              <p class="form-error" role="alert"><ui-icon name="warning-circle" />{{ message }}</p>
            }
            <ui-form-field label="Contraseña actual" [error]="passwordErrorOf('currentPassword')">
              <ui-password-reveal>
                <input #field uiInput type="password" name="currentPassword" formControlName="currentPassword" autocomplete="current-password" />
              </ui-password-reveal>
            </ui-form-field>
            <ui-form-field
              label="Contraseña nueva"
              [hint]="'Entre ' + limits.passwordMin + ' y ' + limits.passwordMax + ' caracteres, con una letra y un número.'"
              [error]="passwordErrorOf('newPassword')"
            >
              <ui-password-reveal>
                <input #field uiInput type="password" name="newPassword" formControlName="newPassword" autocomplete="new-password" />
              </ui-password-reveal>
            </ui-form-field>
            <ui-form-field label="Repite la contraseña nueva" [error]="repeatError()">
              <ui-password-reveal>
                <input #field uiInput type="password" name="repeat" formControlName="repeat" autocomplete="new-password" />
              </ui-password-reveal>
            </ui-form-field>
            <button type="submit" class="btn btn--secondary" [disabled]="changingPassword()">
              {{ changingPassword() ? 'Cambiando…' : 'Cambiar la contraseña' }}
            </button>
            <p class="note">Se cerrará la sesión en tus otros dispositivos.</p>
          </form>
        </aside>
      </div>
    } @else {
      <div class="pending card panel" role="status">No se ha podido confirmar tu sesión. Comprueba la conexión con la API.</div>
    }
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      align-items: start;
      gap: var(--space-4);
    }

    .layout__main {
      display: grid;
      gap: var(--space-4);
      min-width: 0;
    }

    .form-grid h2 {
      font-size: var(--text-base);
      font-weight: 750;
    }

    .note {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .pending {
      margin-top: var(--space-5);
    }

    @media (max-width: 1080px) {
      .layout {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ProfileComponent implements HasUnsavedChanges {
  private readonly store = inject(AuthStore);
  private readonly profile = inject(ProfileService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly notifications = inject(NotificationService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly user = this.store.user;
  protected readonly limits = USER_LIMITS;
  protected readonly account = createAccountForm();
  protected readonly password = createPasswordForm();

  protected readonly saving = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly accountError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly accountSubmitted = signal(false);
  private readonly passwordSubmitted = signal(false);

  // Los formularios reactivos no son signals: estos pulsos avisan de cada cambio.
  private readonly accountChanges = toSignal(this.account.events);
  private readonly passwordChanges = toSignal(this.password.events);

  protected readonly subtitle = computed(() => {
    const user = this.user();
    return user ? `${user.role.label} · En Routly desde ${formatDate(user.createdAt)}` : '';
  });

  protected readonly repeatError = computed(() => {
    this.passwordChanges();
    const control = this.password.controls.repeat;
    if (!control.touched && !this.passwordSubmitted()) return null;
    if (control.errors) return controlErrorMessage(control);
    return this.password.hasError('mismatch') ? 'Las contraseñas no coinciden.' : null;
  });

  constructor() {
    // Se rellena al llegar el usuario, y no en cada cambio: lo que se escribe no se pierde.
    const userId = computed(() => this.user()?._id ?? null);
    effect(() => {
      if (userId()) untracked(() => this.fill());
    });
  }

  hasUnsavedChanges(): boolean {
    return this.account.dirty;
  }

  protected accountErrorOf(name: 'name' | 'email'): string | null {
    this.accountChanges();
    const control = this.account.controls[name];
    return control.touched || this.accountSubmitted() ? controlErrorMessage(control) : null;
  }

  protected passwordErrorOf(name: 'currentPassword' | 'newPassword'): string | null {
    this.passwordChanges();
    const control = this.password.controls[name];
    return control.touched || this.passwordSubmitted() ? controlErrorMessage(control) : null;
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;

    this.accountSubmitted.set(true);
    this.accountError.set(null);
    this.account.markAllAsTouched();
    if (this.account.invalid) {
      this.focusFirstInvalid();
      return;
    }

    const { name, email } = this.account.getRawValue();
    const previous = this.user()?.profile;
    const profile = profilePayload(this.account.controls.profile, previous);

    this.saving.set(true);
    try {
      await this.profile.update({
        name: name.trim(),
        email: email.trim(),
        ...(Object.keys(profile).length > 0 ? { profile } : {}),
      });
      this.fill();
      void this.notifications.success('Cambios guardados.');
    } catch (error) {
      this.showAccountError(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected async changePassword(): Promise<void> {
    if (this.changingPassword()) return;

    this.passwordSubmitted.set(true);
    this.passwordError.set(null);
    this.password.markAllAsTouched();
    if (this.password.invalid) {
      this.focusFirstInvalid();
      return;
    }

    const { currentPassword, newPassword } = this.password.getRawValue();
    this.changingPassword.set(true);
    try {
      await this.profile.changePassword({ currentPassword, newPassword });
      this.password.reset();
      this.passwordSubmitted.set(false);
      void this.notifications.success('Contraseña cambiada.');
    } catch (error) {
      const apiError = this.errors.handle(error, { inline: true });
      if (apiError.fieldErrors) {
        const unmatched = Object.values(applyServerErrors(this.password, apiError.fieldErrors));
        if (unmatched.length > 0) this.passwordError.set(unmatched.join(' '));
        this.focusFirstInvalid();
      } else if (apiError.type === 'validation' || apiError.isConflict) {
        this.passwordError.set(apiError.message);
      }
    } finally {
      this.changingPassword.set(false);
    }
  }

  private fill(): void {
    const user = this.user();
    this.account.patchValue({ name: user?.name ?? '', email: user?.email ?? '' });
    fillProfileGroup(this.account.controls.profile, user?.profile);
    this.account.markAsPristine();
    this.account.markAsUntouched();
    this.accountSubmitted.set(false);
  }

  private showAccountError(error: unknown): void {
    const apiError = this.errors.handle(error, { inline: true });
    if (apiError.fieldErrors) {
      const unmatched = Object.values(applyServerErrors(this.account, apiError.fieldErrors));
      if (unmatched.length > 0) this.accountError.set(unmatched.join(' '));
      this.focusFirstInvalid();
    } else if (apiError.isConflict) {
      applyServerErrors(this.account, { email: apiError.message });
      this.focusFirstInvalid();
    } else if (apiError.type === 'validation') {
      this.accountError.set(apiError.message);
    }
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid, select.ng-invalid')
          ?.focus(),
      { injector: this.injector },
    );
  }
}
