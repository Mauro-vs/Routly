import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiError } from '../../../../core/models/api-error.model';
import { Category } from '../../../../core/models/category.model';
import { Location } from '../../../../core/models/location.model';
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  ROUTE_LIMITS,
  Route,
  RouteDifficulty,
  RoutePayload,
} from '../../../../core/models/route.model';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InputDirective } from '../../../../shared/components/form-field/input.directive';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EntityForm, editedText, optionalText } from '../../../../shared/forms/entity-form';
import { SelectOption, withCurrent } from '../../../../shared/forms/select-options';
import { minTrimmed, notBlank, positive } from '../../../../shared/utils/validators';

// Los mismos criterios que src/schemas/route.schema.js en la API.
function createRouteForm() {
  return new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, minTrimmed(ROUTE_LIMITS.titleMin), Validators.maxLength(ROUTE_LIMITS.title)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(ROUTE_LIMITS.description)],
    }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startLocationId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endLocationId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    difficulty: new FormControl<RouteDifficulty | null>(null, Validators.required),
    distance: new FormControl<number | null>(null, [
      Validators.required,
      positive,
      Validators.max(ROUTE_LIMITS.distance),
    ]),
    duration: new FormControl<number | null>(null, [
      Validators.required,
      positive,
      Validators.max(ROUTE_LIMITS.duration),
    ]),
  });
}

type RouteControls = ReturnType<typeof createRouteForm>['controls'];

/**
 * Campos de una ruta. Los selects ofrecen las categorías y ubicaciones activas; si la
 * ruta que se edita usa una que se ha desactivado después, también aparece (marcada
 * como inactiva): la API la acepta mientras no se cambie.
 */
@Component({
  selector: 'app-route-form',
  imports: [ReactiveFormsModule, FormFieldComponent, InputDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './route-form.component.html',
  styleUrl: './route-form.component.css',
})
export class RouteFormComponent extends EntityForm<Route, RoutePayload, RouteControls> {
  readonly categories = input<readonly Category[]>([]);
  readonly locations = input<readonly Location[]>([]);
  /** Las opciones de los selects aún no han llegado. */
  readonly optionsLoading = input(false);

  protected readonly limits = ROUTE_LIMITS;
  protected readonly difficulties = DIFFICULTIES.map((value) => ({
    value,
    label: DIFFICULTY_LABELS[value],
  }));

  protected readonly categoryOptions = computed<SelectOption[]>(() => {
    const options = this.categories().map((category) => ({
      value: category._id,
      label: category.name,
    }));
    const current = this.record()?.category;
    return withCurrent(
      options,
      current && { value: current._id, label: current.name },
      !this.optionsLoading(),
      'f',
    );
  });

  protected readonly locationOptions = computed<SelectOption[]>(() => {
    const options = this.locations().map((location) => ({
      value: location._id,
      label: placeLabel(location.city, location.region),
    }));
    const route = this.record();
    const loaded = !this.optionsLoading();
    return [route?.startLocation, route?.endLocation].reduce(
      (list, place) =>
        withCurrent(
          list,
          place && { value: place._id, label: placeLabel(place.city, place.region) },
          loaded,
          'f',
        ),
      options,
    );
  });

  constructor() {
    super(createRouteForm());
  }

  protected fill(route: Route | null): void {
    this.form.reset({
      title: route?.title ?? '',
      description: route?.description ?? '',
      categoryId: route?.categoryId ?? '',
      startLocationId: route?.startLocationId ?? '',
      endLocationId: route?.endLocationId ?? '',
      difficulty: route?.difficulty ?? null,
      distance: route?.distance ?? null,
      duration: route?.duration ?? null,
    });
  }

  protected toPayload(): RoutePayload | null {
    const value = this.form.getRawValue();
    const { difficulty, distance, duration } = value;
    // Con el formulario válido estos tres campos tienen valor; la comprobación es para el tipo.
    if (difficulty === null || distance === null || duration === null) return null;

    return {
      title: value.title.trim(),
      description: optionalText(value.description),
      categoryId: value.categoryId,
      startLocationId: value.startLocationId,
      endLocationId: value.endLocationId,
      difficulty,
      distance,
      duration,
    };
  }

  protected override toUpdatePayload(): Partial<RoutePayload> | null {
    const payload = this.toPayload();
    if (!payload) return null;
    const description = editedText(this.form.controls.description.value, this.record()?.description);
    return { ...payload, description };
  }

  // La dirección (slug) sale del título: un 409 por slug repetido se pinta en el título.
  protected override conflictField(error: ApiError): string | null {
    return error.detail?.includes('slug') ? 'title' : null;
  }
}

function placeLabel(city: string, region: string | undefined): string {
  return region ? `${city} (${region})` : city;
}
