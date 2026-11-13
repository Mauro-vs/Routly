import { Injectable, computed, inject } from '@angular/core';

import { BIKE_LIMITS, Bike, BikePayload, bikeName } from '../../../core/models/bike.model';
import { EntityStore, StoreResult } from '../../../core/services/entity.store';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { NotificationService } from '../../../core/services/notification.service';
import { OptionList } from '../../../core/services/option-list';
import { CollectionLabels } from '../../../shared/utils/labels';
import { BikesService, GarageService } from './bikes.service';

/** Cómo se nombra la colección en los textos del panel. */
export const BIKE_LABELS: CollectionLabels = {
  singular: 'moto',
  plural: 'motos',
  gender: 'f',
};

/** Todas las motos: la sección "Motos" del panel, solo para el admin. */
@Injectable({ providedIn: 'root' })
export class BikesStore extends EntityStore<Bike, BikePayload> {
  protected readonly api = inject(BikesService);
  protected readonly listPath = '/bikes';
  protected override readonly notFoundMessage = 'Esa moto ya no existe.';
  readonly labels = BIKE_LABELS;

  /** Usuarios activos, para dar de alta una moto a nombre de otro. */
  readonly ownerOptions = new OptionList(() => this.api.getOwnerOptions(), inject(ErrorHandlerService));

  displayName(bike: Bike): string {
    return bikeName(bike);
  }
}

/** Mi garaje: las motos del usuario de la sesión, en su propia zona. */
@Injectable({ providedIn: 'root' })
export class GarageStore extends EntityStore<Bike, BikePayload> {
  protected readonly api = inject(GarageService);
  protected readonly listPath = '/profile/garage';
  protected override readonly notFoundMessage = 'Esa moto ya no existe.';
  readonly labels = BIKE_LABELS;

  private readonly toasts = inject(NotificationService);

  readonly atLimit = computed(() => this.total() >= BIKE_LIMITS.perUser);

  displayName(bike: Bike): string {
    return bikeName(bike);
  }

  /** La principal va la primera; el resto, de la más reciente a la más antigua. */
  protected override compare(a: Bike, b: Bike): number {
    return Number(b.isPrimary) - Number(a.isPrimary) || super.compare(a, b);
  }

  /** Marca la principal. La anterior deja de serlo en la API: se vuelve a pedir el listado. */
  async setPrimary(bike: Bike): Promise<void> {
    const result = await this.update(bike._id, { isPrimary: true });
    if (!this.report(result, `${bikeName(bike)} es ahora tu moto principal.`)) return;
    await this.load();
  }

  async setPublic(bike: Bike, isPublic: boolean): Promise<void> {
    const name = bikeName(bike);
    const result = await this.update(bike._id, { isPublic });
    this.report(result, isPublic ? `${name} ya se ve en público.` : `${name} ahora es privada.`);
  }

  /** `update` deja el error para un formulario: aquí no lo hay, así que se avisa. */
  private report(result: StoreResult<Bike>, success: string): boolean {
    if (result.ok) void this.toasts.success(success);
    else void this.toasts.errorToast(result.error.message);
    return result.ok;
  }
}
