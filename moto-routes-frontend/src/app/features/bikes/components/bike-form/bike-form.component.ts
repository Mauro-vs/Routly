import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import {
  BIKE_LIMITS,
  BIKE_TYPE_LABELS,
  Bike,
  BikeModification,
  BikePayload,
  BikeType,
  MODIFICATION_TYPE_LABELS,
  ModificationType,
} from '../../../../core/models/bike.model';
import { User } from '../../../../core/models/user.model';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { ReadonlyFieldComponent } from '../../../../shared/components/form-field/readonly-field.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EntityForm, editedText, optionalText } from '../../../../shared/forms/entity-form';
import { controlErrorMessage } from '../../../../shared/utils/form-errors';
import { integer, notBlank, positive } from '../../../../shared/utils/validators';

const TYPE_OPTIONS = Object.entries(BIKE_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const MODIFICATION_OPTIONS = Object.entries(MODIFICATION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function notInFuture(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || value === '') return null;
  return new Date(value).getTime() <= Date.now() ? null : { notFuture: true };
}

const number = (...validators: ((control: AbstractControl) => ValidationErrors | null)[]) =>
  new FormControl<number | null>(null, validators);

// Los mismos criterios que src/schemas/bike.schema.js en la API.
function createBikeForm() {
  return new FormGroup({
    userId: new FormControl('', { nonNullable: true }),
    brand: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(BIKE_LIMITS.brand)],
    }),
    model: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(BIKE_LIMITS.model)],
    }),
    version: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(BIKE_LIMITS.version)] }),
    nickname: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(BIKE_LIMITS.nickname)] }),
    type: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    color: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(BIKE_LIMITS.color)] }),
    year: number(integer, Validators.min(BIKE_LIMITS.yearMin), (control) =>
      Validators.max(new Date().getFullYear() + 1)(control),
    ),
    cc: number(integer, Validators.min(BIKE_LIMITS.ccMin), Validators.max(BIKE_LIMITS.ccMax)),
    hp: number(positive, Validators.max(BIKE_LIMITS.hp)),
    torque: number(positive, Validators.max(BIKE_LIMITS.torque)),
    weight: number(Validators.min(BIKE_LIMITS.weightMin), Validators.max(BIKE_LIMITS.weightMax)),
    seatHeight: number(integer, Validators.min(BIKE_LIMITS.seatHeightMin), Validators.max(BIKE_LIMITS.seatHeightMax)),
    km: number(integer, Validators.min(0), Validators.max(BIKE_LIMITS.km)),
    isPublic: new FormControl(true, { nonNullable: true }),
    modifications: new FormArray<ReturnType<typeof createModification>>([]),
  });
}

function createModification(modification?: BikeModification) {
  return new FormGroup({
    type: new FormControl(modification?.type ?? 'other', { nonNullable: true }),
    title: new FormControl(modification?.title ?? '', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(BIKE_LIMITS.modificationTitle)],
    }),
    description: new FormControl(modification?.description ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(BIKE_LIMITS.modificationDescription)],
    }),
    date: new FormControl(modification?.date?.slice(0, 10) ?? '', {
      nonNullable: true,
      validators: [notInFuture],
    }),
  });
}

type BikeControls = ReturnType<typeof createBikeForm>['controls'];
type ModificationGroup = ReturnType<typeof createModification>;

const NUMERIC = ['year', 'cc', 'hp', 'torque', 'weight', 'seatHeight', 'km'] as const;

/**
 * Campos de una moto, por bloques: identidad, ficha técnica y modificaciones. El carnet no es
 * un campo: lo calcula la API y aquí solo se muestra.
 */
@Component({
  selector: 'app-bike-form',
  imports: [ReactiveFormsModule, FormFieldComponent, IconComponent, InputDirective, ReadonlyFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [id]="formId" class="card panel form-grid" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (formError(); as message) {
        <p class="form-error" role="alert"><ui-icon name="warning-circle" />{{ message }}</p>
      }

      <h2>Identidad</h2>
      @if (canChooseOwner()) {
        <ui-form-field label="Dueño" [hint]="ownersHint()" [error]="errorOf('userId')">
          <select uiInput class="select" name="userId" formControlName="userId">
            <option value="">Yo</option>
            @for (owner of owners(); track owner._id) {
              <option [value]="owner._id">{{ owner.name }}</option>
            }
          </select>
        </ui-form-field>
      }
      <div class="form-row">
        <ui-form-field label="Marca" [error]="errorOf('brand')">
          <input uiInput type="text" name="brand" formControlName="brand" autocomplete="off" />
        </ui-form-field>
        <ui-form-field label="Modelo" [error]="errorOf('model')">
          <input uiInput type="text" name="model" formControlName="model" autocomplete="off" />
        </ui-form-field>
      </div>
      <div class="form-row">
        <ui-form-field label="Versión" [optional]="true" [error]="errorOf('version')">
          <input uiInput type="text" name="version" formControlName="version" autocomplete="off" />
        </ui-form-field>
        <ui-form-field label="Apodo" [optional]="true" hint="Si lo tiene, se muestra en lugar de la marca." [error]="errorOf('nickname')">
          <input uiInput type="text" name="nickname" formControlName="nickname" autocomplete="off" />
        </ui-form-field>
      </div>
      <div class="form-row">
        <ui-form-field label="Tipo" [error]="errorOf('type')">
          <select uiInput class="select" name="type" formControlName="type">
            <option value="" disabled>Elige un tipo</option>
            @for (option of typeOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </ui-form-field>
        <ui-form-field label="Color" [optional]="true" [error]="errorOf('color')">
          <input uiInput type="text" name="color" formControlName="color" autocomplete="off" />
        </ui-form-field>
      </div>
      <label class="check">
        <input type="checkbox" name="isPublic" formControlName="isPublic" />
        Se ve en público
      </label>

      <h2>Ficha técnica</h2>
      <div class="specs">
        <ui-form-field label="Año" [optional]="true" [error]="errorOf('year')">
          <input uiInput type="number" name="year" inputmode="numeric" formControlName="year" />
        </ui-form-field>
        <ui-form-field label="Cilindrada" [optional]="true" [error]="errorOf('cc')">
          <div class="affix">
            <input uiInput type="number" name="cc" inputmode="numeric" formControlName="cc" />
            <span aria-hidden="true">cc</span>
          </div>
        </ui-form-field>
        <ui-form-field label="Potencia" [optional]="true" [error]="errorOf('hp')">
          <div class="affix">
            <input uiInput type="number" name="hp" inputmode="decimal" step="any" formControlName="hp" />
            <span aria-hidden="true">cv</span>
          </div>
        </ui-form-field>
        <ui-form-field label="Par" [optional]="true" [error]="errorOf('torque')">
          <div class="affix">
            <input uiInput type="number" name="torque" inputmode="decimal" step="any" formControlName="torque" />
            <span aria-hidden="true">Nm</span>
          </div>
        </ui-form-field>
        <ui-form-field label="Peso" [optional]="true" [error]="errorOf('weight')">
          <div class="affix">
            <input uiInput type="number" name="weight" inputmode="decimal" step="any" formControlName="weight" />
            <span aria-hidden="true">kg</span>
          </div>
        </ui-form-field>
        <ui-form-field label="Altura de asiento" [optional]="true" [error]="errorOf('seatHeight')">
          <div class="affix">
            <input uiInput type="number" name="seatHeight" inputmode="numeric" formControlName="seatHeight" />
            <span aria-hidden="true">mm</span>
          </div>
        </ui-form-field>
        <ui-form-field label="Kilómetros" [optional]="true" [error]="errorOf('km')">
          <div class="affix">
            <input uiInput type="number" name="km" inputmode="numeric" formControlName="km" />
            <span aria-hidden="true">km</span>
          </div>
        </ui-form-field>
        @if (record(); as bike) {
          <ui-readonly-field label="Carnet" hint="Lo calcula la API con la potencia y la cilindrada.">
            {{ bike.license }}
          </ui-readonly-field>
        }
      </div>

      <div class="mods-head">
        <h2>Modificaciones</h2>
        <span class="muted num">{{ modifications.length }} de {{ limits.modifications }}</span>
      </div>
      @if (modifications.length === 0) {
        <p class="muted">Sin modificaciones. Añade el escape, las maletas o lo que le hayas cambiado.</p>
      }
      <ol class="mods" formArrayName="modifications">
        @for (group of modifications.controls; track group; let index = $index) {
          <li class="mod" [formGroupName]="index">
            <div class="form-row">
              <ui-form-field label="Tipo">
                <select uiInput class="select" [attr.name]="'mod-type-' + index" formControlName="type">
                  @for (option of modificationOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </ui-form-field>
              <ui-form-field label="Título" [error]="modificationError(group, 'title')">
                <input uiInput type="text" [attr.name]="'mod-title-' + index" formControlName="title" autocomplete="off" />
              </ui-form-field>
            </div>
            <div class="form-row">
              <ui-form-field label="Descripción" [optional]="true" [error]="modificationError(group, 'description')">
                <input uiInput type="text" [attr.name]="'mod-description-' + index" formControlName="description" autocomplete="off" />
              </ui-form-field>
              <ui-form-field label="Fecha" [optional]="true" [error]="modificationError(group, 'date')">
                <input uiInput type="date" [attr.name]="'mod-date-' + index" formControlName="date" />
              </ui-form-field>
            </div>
            <button type="button" class="btn btn--secondary btn--sm" (click)="removeModification(index)">
              <ui-icon name="trash" />Quitar
            </button>
          </li>
        }
      </ol>
      <button
        type="button"
        class="btn btn--secondary add"
        [disabled]="modifications.length >= limits.modifications"
        (click)="addModification()"
      >
        <ui-icon name="plus" />Añadir modificación
      </button>
    </form>
  `,
  styles: `
    h2 {
      padding-top: var(--space-2);
      font-size: var(--text-base);
      font-weight: 750;
    }

    h2:first-of-type {
      padding-top: 0;
    }

    .check {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      width: fit-content;
      min-height: 32px;
      font-size: var(--text-sm);
      font-weight: 600;
      cursor: pointer;
    }

    .check input {
      width: 18px;
      height: 18px;
      margin: 0;
    }

    .specs {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: var(--space-4);
    }

    .mods-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .mods {
      display: grid;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .mods:empty {
      display: none;
    }

    .mod {
      display: grid;
      gap: var(--space-3);
      justify-items: start;
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }

    .mod .form-row {
      width: 100%;
    }

    .add {
      justify-self: start;
    }
  `,
})
export class BikeFormComponent extends EntityForm<Bike, BikePayload, BikeControls> {
  /** Solo para el admin: a nombre de quién se da de alta. */
  readonly owners = input<readonly User[] | null>(null);
  readonly ownersLoading = input(false);

  protected readonly limits = BIKE_LIMITS;
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly modificationOptions = MODIFICATION_OPTIONS;
  protected override readonly errorMessages = {
    notFuture: () => 'No puede ser una fecha futura.',
  };

  protected readonly canChooseOwner = computed(() => !this.isEdit() && this.owners() !== null);
  protected readonly ownersHint = computed(() => (this.ownersLoading() ? 'Cargando usuarios…' : ''));

  protected get modifications(): FormArray<ModificationGroup> {
    return this.form.controls.modifications;
  }

  constructor() {
    super(createBikeForm());
  }

  protected addModification(): void {
    if (this.modifications.length >= BIKE_LIMITS.modifications) return;
    this.modifications.push(createModification());
    this.form.markAsDirty();
  }

  protected removeModification(index: number): void {
    this.modifications.removeAt(index);
    this.form.markAsDirty();
  }

  protected modificationError(group: ModificationGroup, name: 'title' | 'description' | 'date'): string | null {
    this.changes();
    const control = group.controls[name];
    return control.touched || this.submitted() ? controlErrorMessage(control, this.errorMessages) : null;
  }

  protected fill(bike: Bike | null): void {
    this.modifications.clear();
    bike?.modifications.forEach((modification) => this.modifications.push(createModification(modification)));
    this.form.reset({
      userId: '',
      brand: bike?.brand ?? '',
      model: bike?.model ?? '',
      version: bike?.version ?? '',
      nickname: bike?.nickname ?? '',
      type: bike?.type ?? '',
      color: bike?.color ?? '',
      year: bike?.year ?? null,
      cc: bike?.cc ?? null,
      hp: bike?.hp ?? null,
      torque: bike?.torque ?? null,
      weight: bike?.weight ?? null,
      seatHeight: bike?.seatHeight ?? null,
      km: bike?.km ?? null,
      isPublic: bike?.isPublic ?? true,
    });
  }

  private modificationsPayload(): BikeModification[] {
    return this.modifications.getRawValue().map(({ type, title, description, date }) => ({
      type: type as ModificationType,
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(date ? { date } : {}),
    }));
  }

  protected toPayload(): BikePayload {
    const value = this.form.getRawValue();
    const modifications = this.modificationsPayload();
    const numbers: Partial<BikePayload> = {};
    for (const name of NUMERIC) {
      if (value[name] !== null) numbers[name] = value[name];
    }

    return {
      brand: value.brand.trim(),
      model: value.model.trim(),
      type: value.type as BikeType,
      isPublic: value.isPublic,
      ...numbers,
      ...(value.userId ? { userId: value.userId } : {}),
      ...(optionalText(value.version) ? { version: value.version.trim() } : {}),
      ...(optionalText(value.nickname) ? { nickname: value.nickname.trim() } : {}),
      ...(optionalText(value.color) ? { color: value.color.trim() } : {}),
      ...(modifications.length > 0 ? { modifications } : {}),
    };
  }

  /** Al editar, un campo vaciado va como `null`, y las modificaciones van enteras. */
  protected override toUpdatePayload(): Partial<BikePayload> {
    const bike = this.record();
    const value = this.form.getRawValue();
    const changes: Partial<BikePayload> = {};
    for (const name of ['version', 'nickname', 'color'] as const) {
      const text = editedText(value[name], bike?.[name]);
      if (text !== undefined) changes[name] = text;
    }
    for (const name of NUMERIC) {
      if (value[name] !== null) changes[name] = value[name];
      else if (bike?.[name] !== undefined) changes[name] = null;
    }

    return {
      brand: value.brand.trim(),
      model: value.model.trim(),
      type: value.type as BikeType,
      isPublic: value.isPublic,
      modifications: this.modificationsPayload(),
      ...changes,
    };
  }
}
