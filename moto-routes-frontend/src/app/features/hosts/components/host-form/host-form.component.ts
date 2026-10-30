import { ChangeDetectionStrategy, Component, computed, effect, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiError } from '../../../../core/models/api-error.model';
import { HOST_LIMITS, Host, HostPayload } from '../../../../core/models/host.model';
import { User } from '../../../../core/models/user.model';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { ReadonlyFieldComponent } from '../../../../shared/components/form-field/readonly-field.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EntityForm, editedText, optionalText } from '../../../../shared/forms/entity-form';
import { SelectOption } from '../../../../shared/forms/select-options';
import { minTrimmed, notBlank } from '../../../../shared/utils/validators';

// Los mismos criterios que src/schemas/host.schema.js en la API.
function createHostForm() {
  return new FormGroup({
    userId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, minTrimmed(2), Validators.maxLength(HOST_LIMITS.name)],
    }),
    biography: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(HOST_LIMITS.biography)],
    }),
  });
}

type HostControls = ReturnType<typeof createHostForm>['controls'];

/**
 * Campos de un anfitrión: su usuario, el nombre público y la biografía. El usuario
 * se elige al crearlo y después no se puede cambiar: al editar se muestra, pero no
 * se envía (la API lo rechazaría con 400).
 */
@Component({
  selector: 'app-host-form',
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    InputDirective,
    IconComponent,
    ReadonlyFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [id]="formId" class="card panel form-grid" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (formError(); as message) {
        <p class="form-error" role="alert"><ui-icon name="warning-circle" />{{ message }}</p>
      }

      @if (isEdit()) {
        <ui-readonly-field label="Usuario" hint="El usuario de un anfitrión no se puede cambiar.">
          {{ currentUser() }}
        </ui-readonly-field>
      } @else {
        <ui-form-field
          label="Usuario"
          [hint]="usersLoading() ? 'Cargando usuarios…' : 'Tiene que tener el rol de anfitrión y no tener ya un perfil.'"
          [error]="errorOf('userId')"
        >
          <select uiInput class="select" name="userId" formControlName="userId">
            <option value="" disabled>Elige un usuario</option>
            @for (option of userOptions(); track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </ui-form-field>
      }

      <ui-form-field
        label="Nombre público"
        hint="El que ven los clientes. Se usa para generar su dirección."
        [counter]="counter('name', limits.name)"
        [error]="errorOf('name')"
      >
        <input uiInput type="text" name="name" formControlName="name" autocomplete="off" />
      </ui-form-field>

      <ui-form-field
        label="Biografía"
        [optional]="true"
        [counter]="counter('biography', limits.biography)"
        [error]="errorOf('biography')"
      >
        <textarea uiInput rows="5" name="biography" formControlName="biography"></textarea>
      </ui-form-field>
    </form>
  `,
})
export class HostFormComponent extends EntityForm<Host, HostPayload, HostControls> {
  readonly users = input<readonly User[]>([]);
  readonly usersLoading = input(false);

  protected readonly limits = HOST_LIMITS;

  protected readonly userOptions = computed<SelectOption[]>(() =>
    this.users().map((user) => ({
      value: user._id,
      label: user.role ? `${user.name} (${user.role.label})` : user.name,
    })),
  );

  protected readonly currentUser = computed(() => {
    const user = this.record()?.user;
    if (!user) return 'Usuario eliminado';
    return user.email ? `${user.name} · ${user.email}` : user.name;
  });

  constructor() {
    super(createHostForm());

    // Al editar, el usuario no se envía: no cuenta para la validación.
    effect(() => {
      const control = this.form.controls.userId;
      if (this.isEdit()) control.disable({ emitEvent: false });
      else control.enable({ emitEvent: false });
    });
  }

  protected fill(host: Host | null): void {
    this.form.reset({
      userId: host?.userId ?? '',
      name: host?.name ?? '',
      biography: host?.biography ?? '',
    });
  }

  protected toPayload(): HostPayload {
    const { userId, name, biography } = this.form.getRawValue();
    return { userId, name: name.trim(), biography: optionalText(biography) };
  }

  protected override toUpdatePayload(): Partial<HostPayload> {
    const { name, biography } = this.form.getRawValue();
    return { name: name.trim(), biography: editedText(biography, this.record()?.biography) };
  }

  // El 409 al crear es un usuario que ya tiene perfil de anfitrión.
  protected override conflictField(error: ApiError): string | null {
    return error.detail?.includes('host profile') ? 'userId' : null;
  }
}
