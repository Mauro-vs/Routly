import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BIKE_LIMITS, Bike } from '../../../../core/models/bike.model';
import { BikeCardComponent } from '../../../../shared/components/bike-card/bike-card.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { GarageStore } from '../../services/bikes.store';

/** Mi garaje (`/profile/garage`): las motos del usuario de la sesión. */
@Component({
  selector: 'app-my-garage',
  imports: [
    RouterLink,
    BikeCardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-garage.component.html',
  styleUrl: './my-garage.component.css',
})
export class MyGarageComponent {
  protected readonly store = inject(GarageStore);
  protected readonly limit = BIKE_LIMITS.perUser;

  protected readonly failed = computed(
    () => (!this.store.loaded() && !this.store.loading() && this.store.error()) || null,
  );
  protected readonly subtitle = computed(() =>
    this.store.loaded() ? `${this.store.total()} de ${this.limit} motos.` : 'Tus motos, con su ficha y sus fotos.',
  );

  constructor() {
    void this.store.load();
  }

  protected reload(): void {
    void this.store.load();
  }

  protected remove(bike: Bike): void {
    void this.store.confirmAndRemove(bike);
  }
}
