import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiError } from '../../../../core/models/api-error.model';
import {
  LOCATION_LIMITS,
  Location,
  LocationPayload,
} from '../../../../core/models/location.model';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EntityForm, editedText, optionalText } from '../../../../shared/forms/entity-form';
import { bothOrNone, minTrimmed, notBlank } from '../../../../shared/utils/validators';

/** El país que pone la API si no se envía. */
const DEFAULT_COUNTRY = 'España';

// Los mismos criterios que src/schemas/location.schema.js en la API.
function createLocationForm() {
  return new FormGroup(
    {
      city: new FormControl('', {
        nonNullable: true,
        validators: [notBlank, minTrimmed(2), Validators.maxLength(LOCATION_LIMITS.city)],
      }),
      region: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(LOCATION_LIMITS.region)],
      }),
      country: new FormControl(DEFAULT_COUNTRY, {
        nonNullable: true,
        validators: [notBlank, minTrimmed(2), Validators.maxLength(LOCATION_LIMITS.country)],
      }),
      latitude: new FormControl<number | null>(null, [Validators.min(-90), Validators.max(90)]),
      longitude: new FormControl<number | null>(null, [Validators.min(-180), Validators.max(180)]),
    },
    { validators: bothOrNone('latitude', 'longitude') },
  );
}

type LocationControls = ReturnType<typeof createLocationForm>['controls'];

/**
 * Campos de una ubicación: el lugar y, si se quieren, sus coordenadas. La latitud y
 * la longitud van las dos o ninguna, como pide la API.
 *
 * Al editar, vaciar las dos quita las coordenadas: se envían a `null`.
 */
@Component({
  selector: 'app-location-form',
  imports: [ReactiveFormsModule, FormFieldComponent, InputDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [id]="formId" class="card panel form-grid" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (formError(); as message) {
        <p class="form-error" role="alert"><ui-icon name="warning-circle" />{{ message }}</p>
      }

      <ui-form-field
        label="Ciudad"
        hint="Se usa para generar su dirección."
        [counter]="counter('city', limits.city)"
        [error]="errorOf('city')"
      >
        <input uiInput type="text" name="city" formControlName="city" autocomplete="off" />
      </ui-form-field>

      <div class="form-row">
        <ui-form-field label="Región" [optional]="true" [error]="errorOf('region')">
          <input uiInput type="text" name="region" formControlName="region" autocomplete="off" />
        </ui-form-field>
        <ui-form-field label="País" [error]="errorOf('country')">
          <input uiInput type="text" name="country" formControlName="country" autocomplete="off" />
        </ui-form-field>
      </div>

      <fieldset class="coordinates" [attr.aria-describedby]="coordinatesError() ? 'coordinates-error' : 'coordinates-hint'">
        <legend>Coordenadas <span class="optional">(opcional)</span></legend>
        <div class="form-row">
          <ui-form-field label="Latitud" [error]="errorOf('latitude')">
            <input uiInput type="number" name="latitude" inputmode="decimal" step="any" min="-90" max="90" formControlName="latitude" />
          </ui-form-field>
          <ui-form-field label="Longitud" [error]="errorOf('longitude')">
            <input uiInput type="number" name="longitude" inputmode="decimal" step="any" min="-180" max="180" formControlName="longitude" />
          </ui-form-field>
        </div>
        @if (coordinatesError(); as message) {
          <p class="coordinates__error" id="coordinates-error"><ui-icon name="warning-circle" />{{ message }}</p>
        } @else {
          <p class="coordinates__hint" id="coordinates-hint">
            En grados decimales, por ejemplo 39.5696 y 2.6502. Las dos o ninguna.
          </p>
        }
      </fieldset>
    </form>
  `,
  styles: `
    .coordinates {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }

    legend {
      margin-bottom: var(--space-2);
      padding: 0;
      font-size: var(--text-sm);
      font-weight: 600;
    }

    .optional {
      font-weight: 400;
      color: var(--color-text-muted);
    }

    .coordinates__hint,
    .coordinates__error {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .coordinates__error {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: var(--color-danger);
    }
  `,
})
export class LocationFormComponent extends EntityForm<Location, LocationPayload, LocationControls> {
  protected readonly limits = LOCATION_LIMITS;

  protected readonly coordinatesError = computed(() => {
    const latitude = this.errorOf('latitude');
    const longitude = this.errorOf('longitude');
    if (latitude || longitude) return null;
    const touched = this.form.controls.latitude.touched || this.form.controls.longitude.touched;
    return (touched || this.submitted()) && this.form.hasError('pair')
      ? 'Indica la latitud y la longitud, o ninguna de las dos.'
      : null;
  });

  constructor() {
    super(createLocationForm());
  }

  protected fill(location: Location | null): void {
    this.form.reset({
      city: location?.city ?? '',
      region: location?.region ?? '',
      country: location?.country ?? DEFAULT_COUNTRY,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
    });
  }

  protected toPayload(): LocationPayload {
    const value = this.form.getRawValue();
    return {
      city: value.city.trim(),
      region: optionalText(value.region),
      country: value.country.trim(),
      ...coordinates(value.latitude, value.longitude),
    };
  }

  protected override toUpdatePayload(): Partial<LocationPayload> {
    const value = this.form.getRawValue();
    const hadCoordinates = this.record()?.latitude !== undefined;
    const cleared = value.latitude === null && value.longitude === null;
    return {
      city: value.city.trim(),
      region: editedText(value.region, this.record()?.region),
      country: value.country.trim(),
      // Vaciar las dos quita las coordenadas que tenía
      ...(hadCoordinates && cleared
        ? { latitude: null, longitude: null }
        : coordinates(value.latitude, value.longitude)),
    };
  }

  // El único 409 al guardar es un lugar repetido (ciudad, región y país).
  protected override conflictField(_error: ApiError): string {
    return 'city';
  }
}

function coordinates(
  latitude: number | null,
  longitude: number | null,
): Pick<LocationPayload, 'latitude' | 'longitude'> {
  return latitude !== null && longitude !== null ? { latitude, longitude } : {};
}
