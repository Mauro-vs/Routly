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
  template: `
    <ui-page-header title="Mi garaje" [subtitle]="subtitle()">
      @if (!store.atLimit()) {
        <a class="btn btn--primary" routerLink="/profile/garage/new"><ui-icon name="plus" />Añadir moto</a>
      }
    </ui-page-header>

    @if (failed(); as error) {
      <div class="card">
        <ui-error-state title="No se ha podido cargar tu garaje" [error]="error" (retry)="reload()" />
      </div>
    } @else if (!store.loaded()) {
      <div class="grid" aria-busy="true" aria-label="Cargando tu garaje">
        <ui-skeleton height="170px" />
        <ui-skeleton height="170px" />
      </div>
    } @else if (store.total() === 0) {
      <div class="card">
        <ui-empty-state
          icon="motorcycle"
          title="Tu garaje está vacío"
          description="Añade tu primera moto: su ficha, sus modificaciones y sus fotos."
        >
          <a class="btn btn--primary" routerLink="/profile/garage/new"><ui-icon name="plus" />Añadir moto</a>
        </ui-empty-state>
      </div>
    } @else {
      <ul class="grid">
        @for (bike of store.items(); track bike._id) {
          <li>
            <ui-bike-card [bike]="bike" [link]="['/profile/garage', bike.slug]">
              <p class="marks">
                @if (bike.isPrimary) {
                  <span class="badge badge--info">Principal</span>
                }
                @if (!bike.isPublic) {
                  <span class="badge badge--neutral">Privada</span>
                }
                @if (!bike.isActive) {
                  <span class="badge badge--off">Inactiva</span>
                }
              </p>
              <div class="actions">
                <a class="btn btn--secondary btn--sm" [routerLink]="['/profile/garage', bike.slug]">
                  <ui-icon name="pencil-simple" />Editar
                </a>
                @if (!bike.isPrimary) {
                  <button
                    type="button"
                    class="btn btn--secondary btn--sm"
                    [disabled]="store.saving()"
                    (click)="store.setPrimary(bike)"
                  >
                    <ui-icon name="star" />Hacer principal
                  </button>
                }
                <button
                  type="button"
                  class="btn btn--secondary btn--sm"
                  [disabled]="store.saving()"
                  (click)="store.setPublic(bike, !bike.isPublic)"
                >
                  <ui-icon [name]="bike.isPublic ? 'eye-slash' : 'eye'" />
                  {{ bike.isPublic ? 'Hacer privada' : 'Hacer pública' }}
                </button>
                <button
                  type="button"
                  class="icon-btn icon-btn--danger"
                  [attr.aria-label]="'Eliminar ' + store.displayName(bike)"
                  [disabled]="store.isBusy(bike._id)"
                  (click)="remove(bike)"
                >
                  <ui-icon name="trash" />
                </button>
              </div>
            </ui-bike-card>
          </li>
        }
      </ul>
      @if (store.atLimit()) {
        <p class="limit">Has llegado al máximo de {{ limit }} motos. Elimina una para añadir otra.</p>
      }
    }
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 460px), 1fr));
      gap: var(--space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .marks {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
    }

    .marks:empty {
      display: none;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }

    .limit {
      margin-top: var(--space-4);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }
  `,
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
