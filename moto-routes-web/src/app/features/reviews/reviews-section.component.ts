import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { LOGIN_PATH } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { ReviewsApiService } from '../../core/reviews/reviews-api.service';
import { Review, ReviewTargetType } from '../../core/reviews/reviews.models';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { PhotoViewerComponent, ViewerPhoto } from './components/photo-viewer.component';
import { ReviewFormComponent } from './components/review-form.component';
import { ReviewItemComponent } from './components/review-item.component';
import { ReviewsSummaryComponent } from './components/reviews-summary.component';
import { reviewErrorMessage } from './review-errors';
import { REVIEW_SORTS, ReviewSort, parseReviewsQuery } from './reviews-query';
import { ReviewsStore } from './reviews.store';

/**
 * La sección de opiniones, la misma para una experiencia y para un guía (targetType + slug):
 * la nota con su reparto, las fotos de los clientes, mi opinión (o el botón de escribirla), el
 * orden y los filtros (en la URL), la lista con "Ver más" y el formulario.
 *
 * Sin sesión, "Escribir una opinión" lleva a entrar y vuelve aquí. El anfitrión no puede opinar
 * sobre lo suyo: lo dice la API (canReview), así la web no cambia cuando cambie la regla.
 * Encima de la lista hay un hueco ([reviews-extra]) para el resumen IA.
 */
@Component({
  selector: 'app-reviews-section',
  imports: [
    ReviewsSummaryComponent,
    ReviewItemComponent,
    ReviewFormComponent,
    PhotoViewerComponent,
    ConfirmDialogComponent,
    SkeletonComponent,
    IconComponent,
  ],
  providers: [ReviewsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="opiniones" aria-labelledby="opiniones-titulo">
      <header class="head">
        <h2 id="opiniones-titulo">Opiniones</h2>
        @if (!writing()) {
          @if (canWrite()) {
            <button type="button" class="btn-primary" (click)="write()">Escribir una opinión</button>
          } @else if (ownTarget()) {
            <p class="note">{{ type() === 'host' ? 'Es tu perfil de guía: no puedes opinar sobre ti mismo.' : 'Es una de tus experiencias: no puedes opinar sobre ella.' }}</p>
          }
        }
      </header>

      @if (store.summary(); as summary) {
        @if (summary.count > 0) {
          <app-reviews-summary [rating]="summary" [activeStars]="store.query().stars" (toggleStars)="store.toggleStars($event)" />
        } @else if (!writing()) {
          <p class="empty">Aún no hay opiniones. {{ canWrite() ? 'Cuéntanos qué tal te fue: la tuya será la primera.' : '' }}</p>
        }
      } @else if (store.status() === 'loading') {
        <ui-skeleton height="120px" />
      }

      <ng-content select="[reviews-extra]" />

      @if (store.photos().length > 0) {
        <div class="strip">
          <h3>Fotos de los clientes</h3>
          <ul>
            @for (photo of store.photos(); track photo._id; let i = $index) {
              <li>
                <button type="button" (click)="openStrip(i)" [attr.aria-label]="'Ver en grande la foto ' + (i + 1) + ', de ' + photo.author">
                  <img [src]="photo.url" alt="" loading="lazy" decoding="async" width="96" height="96" />
                </button>
              </li>
            }
          </ul>
        </div>
      }

      @if (writing()) {
        <div class="form-box">
          <h3>{{ store.mine()?.review ? 'Editar mi opinión' : 'Mi opinión sobre ' + name() }}</h3>
          <app-review-form [type]="type()" [targetId]="targetId()" [review]="store.mine()?.review ?? null" (saved)="onSaved()" (cancel)="writing.set(false)" />
        </div>
      } @else if (store.mine()?.review; as mine) {
        <app-review-item class="mine" [review]="mine" [mine]="true" (openPhoto)="openReview(mine, $event)" (edit)="writing.set(true)" (remove)="remove(mine)" />
      }
      @if (removeError(); as error) {<p class="form-error" role="alert">{{ error }}</p>}

      @if ((store.summary()?.count ?? 0) > 0) {
        <div class="toolbar">
          <label class="field sort">
            <span class="sr-only">Ordenar las opiniones</span>
            <select [value]="store.query().sort" (change)="setSort($event)">
              @for (sort of sorts; track sort.value) {
                <option [value]="sort.value">{{ sort.label }}</option>
              }
            </select>
          </label>
          @if ((store.summary()?.withPhotos ?? 0) > 0) {
            <button type="button" class="chip" [attr.aria-pressed]="store.query().withPhotos" (click)="store.setWithPhotos(!store.query().withPhotos)">
              <ui-icon name="images" /> Con fotos ({{ store.summary()?.withPhotos }})
            </button>
          }
          @if (store.query().stars; as stars) {
            <button type="button" class="chip" aria-pressed="true" (click)="store.toggleStars(stars)">{{ stars }} ★ <ui-icon name="x" /><span class="sr-only">Quitar el filtro</span></button>
          }
          <p class="total num" aria-live="polite">{{ store.total() }} {{ store.total() === 1 ? 'opinión' : 'opiniones' }}</p>
        </div>
      }

      @switch (store.status()) {
        @case ('error') {
          <div class="state" role="alert">
            <p>{{ store.error() }}</p>
            <button type="button" class="btn-ghost" (click)="store.refresh()"><ui-icon name="arrows-clockwise" /> Reintentar</button>
          </div>
        }
        @case ('loading') {
          @if (store.summary()) {<ui-skeleton height="96px" />}
        }
        @default {
          @if (store.others().length === 0 && (store.query().stars || store.query().withPhotos)) {
            <div class="state">
              <p>Ninguna opinión con ese filtro.</p>
              <button type="button" class="btn-ghost" (click)="store.clearFilters()">Ver todas</button>
            </div>
          }
          @for (review of store.others(); track review._id) {
            <app-review-item [review]="review" (openPhoto)="openReview(review, $event)" />
          }
          @if (store.hasMore()) {
            <button type="button" class="btn-ghost more" [disabled]="store.loadingMore()" (click)="store.loadMore()">
              {{ store.loadingMore() ? 'Cargando…' : 'Ver más opiniones' }}
            </button>
          }
        }
      }
    </section>

    <app-photo-viewer #viewer [photos]="viewerPhotos()" />
    <ui-confirm-dialog #confirm title="¿Borrar tu opinión?" message="Se quitará con sus fotos y dejará de contar en la nota." confirmLabel="Borrar" [danger]="true" />
  `,
  styles: `
    section {
      display: grid;
      gap: var(--space-5);
      scroll-margin-top: var(--space-5);
    }

    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    h2 {
      font-size: 26px;
      font-weight: 850;
      letter-spacing: -0.02em;
    }

    h3 {
      font-size: 17px;
      font-weight: 800;
    }

    .note,
    .empty,
    .total {
      color: var(--color-text-muted);
    }

    .strip {
      display: grid;
      gap: var(--space-2);
    }

    .strip ul {
      display: flex;
      gap: var(--space-2);
      margin: 0;
      padding: 0 0 var(--space-2);
      overflow-x: auto;
      list-style: none;
    }

    .strip button {
      display: block;
      padding: 0;
      border: 0;
      border-radius: var(--radius-md);
      background: none;
      cursor: zoom-in;
    }

    .strip img {
      display: block;
      width: 96px;
      height: 96px;
      border-radius: var(--radius-md);
      object-fit: cover;
    }

    .form-box {
      display: grid;
      gap: var(--space-4);
      padding: var(--space-5);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }

    .mine {
      padding-inline: var(--space-4);
      border-radius: var(--radius-lg);
      background: var(--color-primary-soft);
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 44px;
      padding: 0 var(--space-4);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-pill);
      background: none;
      color: inherit;
      font: inherit;
      font-weight: 650;
      cursor: pointer;
    }

    .chip[aria-pressed='true'] {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }

    .total {
      margin-left: auto;
      font-size: var(--text-sm);
    }

    .state {
      display: grid;
      justify-items: start;
      gap: var(--space-3);
    }

    .more {
      justify-self: center;
    }
  `,
})
export class ReviewsSectionComponent {
  readonly type = input.required<ReviewTargetType>();
  readonly slug = input.required<string>();
  /** El _id de la experiencia o del guía (POST /api/reviews lo pide) */
  readonly targetId = input.required<string>();
  /** Cómo se nombra en el formulario: "Calas de Mallorca", "Lucía" */
  readonly name = input.required<string>();
  /** Se ha escrito, editado o borrado una opinión: la nota guardada de la página ha cambiado */
  readonly changed = output<void>();

  protected readonly store = inject(ReviewsStore);
  private readonly api = inject(ReviewsApiService);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly viewer = viewChild.required<PhotoViewerComponent>('viewer');
  private readonly confirm = viewChild.required<ConfirmDialogComponent>('confirm');

  protected readonly sorts = (Object.keys(REVIEW_SORTS) as ReviewSort[]).map((value) => ({ value, label: REVIEW_SORTS[value].label }));
  protected readonly writing = signal(false);
  protected readonly removeError = signal<string | null>(null);
  protected readonly viewerPhotos = signal<ViewerPhoto[]>([]);
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map(parseReviewsQuery)), { requireSync: true });

  /** Sale el botón: sin sesión (lleva a entrar) o con sesión si la API dice que puedo */
  protected readonly canWrite = computed(() => {
    if (!this.auth.hasSession()) return true;
    const mine = this.store.mine();
    return mine !== null && mine.canReview;
  });
  protected readonly ownTarget = computed(() => this.store.mine()?.reason === 'OWN_TARGET');

  constructor() {
    effect(() => void this.store.load(this.type(), this.slug(), this.query()));
    // Mi opinión: cuando se sabe quién soy, y otra vez si entro o salgo
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();
      this.slug();
      untracked(() => (loggedIn ? void this.store.loadMine() : this.store.forgetMine()));
    });
  }

  write(): void {
    if (!this.auth.hasSession()) {
      void this.router.navigate([LOGIN_PATH], { queryParams: { volver: this.router.url.split('#')[0] } });
      return;
    }
    this.removeError.set(null);
    this.writing.set(true);
  }

  protected setSort(event: Event): void {
    this.store.setSort((event.target as HTMLSelectElement).value as ReviewSort);
  }

  protected openStrip(index: number): void {
    this.viewerPhotos.set(this.store.photos());
    this.viewer().open(index);
  }

  protected openReview(review: Review, index: number): void {
    this.viewerPhotos.set(review.photos.map((photo) => ({ ...photo, author: review.user?.name })));
    this.viewer().open(index);
  }

  protected async onSaved(): Promise<void> {
    this.writing.set(false);
    await this.store.refresh();
    this.changed.emit();
  }

  protected async remove(review: Review): Promise<void> {
    if (!(await this.confirm().open())) return;
    this.removeError.set(null);
    try {
      await this.api.remove(review._id);
      await this.store.refresh();
      this.changed.emit();
    } catch (error) {
      this.removeError.set(reviewErrorMessage(error, this.type()));
    }
  }
}
