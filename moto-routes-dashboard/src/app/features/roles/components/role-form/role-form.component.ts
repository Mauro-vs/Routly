import { ChangeDetectionStrategy, Component, computed, effect } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiError } from '../../../../core/models/api-error.model';
import { ROLE_LIMITS, Role, RolePayload } from '../../../../core/models/role.model';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { ReadonlyFieldComponent } from '../../../../shared/components/form-field/readonly-field.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EntityForm, editedText, optionalText } from '../../../../shared/forms/entity-form';
import { minTrimmed, notBlank } from '../../../../shared/utils/validators';
import { SYSTEM_ROLE_REASONS } from '../../services/roles.store';

/** El nombre interno: minúsculas, números y guiones, como `content-editor`. */
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Los mismos criterios que src/schemas/role.schema.js en la API.
function createRoleForm() {
  return new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        notBlank,
        minTrimmed(2),
        Validators.maxLength(ROLE_LIMITS.name),
        Validators.pattern(NAME_PATTERN),
      ],
    }),
    label: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, minTrimmed(2), Validators.maxLength(ROLE_LIMITS.label)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(ROLE_LIMITS.description)],
    }),
  });
}

type RoleControls = ReturnType<typeof createRoleForm>['controls'];

/**
 * Campos de un rol: el nombre interno (el que usa el código), el nombre visible y una
 * descripción. El nombre interno de un rol base no se puede cambiar: se muestra
 * pero no se envía.
 */
@Component({
  selector: 'app-role-form',
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

      <div class="form-row">
        <ui-form-field
          label="Nombre visible"
          hint="El que se ve en el panel, por ejemplo Editor."
          [counter]="counter('label', limits.label)"
          [error]="errorOf('label')"
        >
          <input uiInput type="text" name="label" formControlName="label" autocomplete="off" />
        </ui-form-field>

        @if (isSystem()) {
          <ui-readonly-field label="Nombre interno" [hint]="renameReason">
            <span translate="no">{{ record()?.name }}</span>
          </ui-readonly-field>
        } @else {
          <ui-form-field
            label="Nombre interno"
            hint="Minúsculas, números y guiones: content-editor."
            [counter]="counter('name', limits.name)"
            [error]="errorOf('name')"
          >
            <input uiInput type="text" name="name" formControlName="name" autocomplete="off" spellcheck="false" />
          </ui-form-field>
        }
      </div>

      <ui-form-field
        label="Descripción"
        [optional]="true"
        [counter]="counter('description', limits.description)"
        [error]="errorOf('description')"
      >
        <textarea uiInput rows="3" name="description" formControlName="description"></textarea>
      </ui-form-field>
    </form>
  `,
})
export class RoleFormComponent extends EntityForm<Role, RolePayload, RoleControls> {
  protected readonly limits = ROLE_LIMITS;
  protected readonly renameReason = SYSTEM_ROLE_REASONS.rename;
  protected readonly isSystem = computed(() => this.record()?.isSystem ?? false);
  protected override readonly errorMessages = {
    pattern: () => 'Usa solo minúsculas, números y guiones, sin espacios.',
  };

  constructor() {
    super(createRoleForm());

    // Un rol base no envía su nombre: el control no cuenta para la validación.
    effect(() => {
      const control = this.form.controls.name;
      if (this.isSystem()) control.disable({ emitEvent: false });
      else control.enable({ emitEvent: false });
    });
  }

  protected fill(role: Role | null): void {
    this.form.reset({
      name: role?.name ?? '',
      label: role?.label ?? '',
      description: role?.description ?? '',
    });
  }

  protected toPayload(): RolePayload {
    const { name, label, description } = this.form.getRawValue();
    return { name: name.trim(), label: label.trim(), description: optionalText(description) };
  }

  protected override toUpdatePayload(): Partial<RolePayload> {
    const { name, label, description } = this.form.getRawValue();
    const payload: Partial<RolePayload> = {
      label: label.trim(),
      description: editedText(description, this.record()?.description),
    };
    if (!this.isSystem()) payload.name = name.trim();
    return payload;
  }

  // Un 409 al guardar es un nombre interno repetido.
  protected override conflictField(_error: ApiError): string | null {
    return this.isSystem() ? null : 'name';
  }
}
