import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { BOOKING_UNAVAILABLE, BookingService } from '../../core/booking/booking.service';
import { PageMetaStrategy } from '../../core/services/page-meta.strategy';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { sceneFor } from '../../shared/ui/photo/landscape';
import { PhotoComponent } from '../../shared/ui/photo/photo.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { formatHours, formatPrice, formatShortDate, plural } from '../../shared/utils/shop-format';
import { DeparturePickerComponent } from './components/departure-picker/departure-picker.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { RouteSignComponent } from './components/route-sign/route-sign.component';
import { DEPARTURE_PARAM, ExperienceStore } from './experience.store';

/** Los idiomas de las experiencias (los mismos códigos que la API) */
const LANGUAGES: Record<string, string> = {
  es: 'Español',
  en: 'Inglés',
  fr: 'Francés',
  de: 'Alemán',
  it: 'Italiano',
  pt: 'Portugués',
  ca: 'Catalán',
  eu: 'Euskera',
  gl: 'Gallego',
};

/**
 * El detalle de una experiencia (modo Operate): entender qué carretera es, con quién y cuándo, y
 * elegir una salida. La salida elegida va en la URL (?salida=) y el botón "Reservar" queda listo
 * para la fase de reservas (BookingService).
 * Contrato de dirección: .impeccable/surfaces/moto-routes-web-src-app-features-experience.md
 */
@Component({
  selector: 'app-experience-page',
  imports: [RouterLink, GalleryComponent, RouteSignComponent, DeparturePickerComponent, PhotoComponent, SkeletonComponent, IconComponent],
  providers: [ExperienceStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (store.status()) {
      @case ('notFound') {
        <section class="on-band">
          <div class="wrap lost">
            <h1>No hemos encontrado esta experiencia</h1>
            <p>Puede que ya no esté disponible o que la dirección haya cambiado.</p>
            <a class="btn-primary" routerLink="/experiencias">Ver las experiencias</a>
          </div>
        </section>
      }
      @case ('error') {
        <section class="on-band">
          <div class="wrap lost" role="alert">
            <h1>No se ha podido cargar la experiencia</h1>
            <p>{{ store.error() }}</p>
            <button type="button" class="btn-primary" (click)="store.load(slug())"><ui-icon name="arrows-clockwise" /> Reintentar</button>
          </div>
        </section>
      }
      @default {
        <section class="on-band head" [attr.aria-busy]="store.status() === 'loading'">
          <div class="wrap">
            <button type="button" class="back" (click)="back()"><ui-icon name="arrow-left" /> Volver a las experiencias</button>
            @if (experience(); as experience) {
              <h1 [class.is-long]="experience.title.length > 60">{{ experience.title }}</h1>
              <p class="sub">
                @if (experience.route?.category; as category) {<span>{{ category.name }}</span>}
                @if (experience.host; as host) {<span>con {{ host.name }}</span>}
                @if (experience.priceFrom !== null) {<span class="num">desde {{ price(experience.priceFrom) }}</span>}
              </p>
            } @else {
              <ui-skeleton class="title-skeleton" width="min(560px, 80%)" height="48px" />
            }
          </div>
        </section>

        @if (experience(); as experience) {
          <div class="wrap gallery-wrap">
            <app-gallery [images]="experience.images" [title]="experience.title" [seed]="experience.slug" [scene]="sceneOf(experience.route?.category?.name)" />
          </div>

          <div class="wrap layout">
            <div class="main">
              @if (experience.route; as route) {
                <app-route-sign class="route-sign" [route]="route" />
              }

              @if (experience.description) {
                <p class="description">{{ experience.description }}</p>
              }

              <dl class="practical">
                <div><dt><ui-icon name="map-pin" /> Punto de encuentro</dt><dd>{{ experience.meetingPoint || 'Lo confirma el anfitrión al reservar' }}</dd></div>
                <div><dt><ui-icon name="clock" /> Duración</dt><dd class="num">{{ hours(experience.duration) }}</dd></div>
                <div><dt><ui-icon name="translate" /> Idioma</dt><dd>{{ language(experience.language) }}</dd></div>
                <div><dt><ui-icon name="users" /> Participantes</dt><dd class="num">De {{ experience.minParticipants }} a {{ experience.maxParticipants }}</dd></div>
                @if (experience.guideBike; as bike) {
                  <div><dt><ui-icon name="motorcycle" /> Moto del guía</dt><dd>{{ bike.brand }} {{ bike.model }}@if (bike.version) { {{ bike.version }}}</dd></div>
                }
              </dl>

              @if (experience.host; as host) {
                <section class="host" aria-labelledby="anfitrion-titulo">
                  <ui-photo class="host-photo" [src]="host.coverImage?.url ?? null" [seed]="host.slug" alt="" />
                  <div>
                    <h2 id="anfitrion-titulo">Tu anfitrión: {{ host.name }}</h2>
                    <p>{{ host.biography || 'Aún no ha contado nada sobre sí mismo.' }}</p>
                    <a [routerLink]="['/experiencias']" [queryParams]="{ anfitrion: host.slug }">Más salidas con {{ host.name }}</a>
                  </div>
                </section>
              }
            </div>

            <aside class="booking" aria-labelledby="salidas-titulo">
              <header class="booking-head">
                <h2 id="salidas-titulo">Elige una salida</h2>
                @if (experience.priceFrom !== null) {
                  <p class="booking-from num">desde <strong>{{ price(experience.priceFrom) }}</strong></p>
                }
              </header>
              @if (store.departures().length > 0) {
                <app-departure-picker
                  [departures]="store.departures()"
                  [selectedSlug]="store.selected()?.slug ?? null"
                  labelledBy="salidas-titulo"
                  (select)="store.select($event)"
                />
                <div class="cta">
                  @if (store.selected(); as selected) {
                    <p class="summary num">{{ shortDate(selected.startAt) }} · {{ plural(selected.seatsLeft, 'plaza libre', 'plazas libres') }} · {{ price(selected.price) }} por persona</p>
                  } @else {
                    <p class="summary muted">Elige una fecha para reservar.</p>
                  }
                  <button type="button" class="btn-primary reserve" [disabled]="!booking.available || !store.selected()" aria-describedby="reserva-motivo">
                    Reservar
                  </button>
                  <p id="reserva-motivo" class="reason">{{ unavailable }}</p>
                </div>
              } @else {
                <p class="no-dates">Aún no hay salidas programadas para esta experiencia. Vuelve pronto o mira otras salidas de {{ experience.host?.name ?? 'su anfitrión' }}.</p>
              }
            </aside>

            <!-- En el móvil, la salida elegida y el botón siempre a la vista, abajo -->
            @if (store.departures().length > 0) {
              <div class="mobile-bar on-band" aria-hidden="true">
                <p class="num">
                  @if (store.selected(); as selected) {
                    <strong>{{ shortDate(selected.startAt) }}</strong> · {{ price(selected.price) }}
                  } @else {
                    desde <strong>{{ price(experience.priceFrom ?? 0) }}</strong>
                  }
                </p>
                <a class="btn-primary" href="#salidas-titulo" tabindex="-1">{{ store.selected() ? 'Ver la reserva' : 'Elegir fecha' }}</a>
              </div>
            }
          </div>
        }
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .head .wrap {
      display: grid;
      justify-items: start;
      gap: var(--space-3);
      padding-block: var(--space-5) var(--space-7);
    }

    .back {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 44px;
      padding: 0;
      border: 0;
      background: none;
      color: var(--color-on-band-muted);
      font-weight: 650;
      cursor: pointer;
    }

    .back:hover {
      color: var(--color-on-band);
    }

    h1 {
      max-width: 22ch;
      font-size: clamp(34px, 5vw, 64px);
      font-weight: 850;
      letter-spacing: -0.04em;
      line-height: 0.98;
    }

    /* Un título largo (la API admite 120 caracteres) a 64 px ocupa cuatro líneas y saca la galería
       de la primera pantalla: más pequeño y más ancho */
    h1.is-long {
      max-width: 32ch;
      font-size: clamp(28px, 3.4vw, 42px);
      line-height: 1.05;
    }

    .title-skeleton {
      background: rgb(255 255 255 / 0.12);
    }

    .sub {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-4);
      color: var(--color-on-band-muted);
      font-weight: 650;
    }

    /* La galería sube sobre la banda: las fotos empiezan donde acaba el título */
    .gallery-wrap {
      margin-top: calc(var(--space-7) * -1 + var(--space-3));
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
      align-items: start;
      gap: var(--space-7);
      padding-block: var(--space-7);
    }

    .main {
      display: grid;
      gap: var(--space-6);
    }

    .description {
      max-width: 65ch;
      font-size: 17px;
      line-height: 1.6;
    }

    .practical {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-4) var(--space-6);
      padding: var(--space-5) 0;
      border-block: 1px solid var(--color-border);
    }

    dt {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      font-weight: 750;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    dd {
      margin: var(--space-1) 0 0;
      font-weight: 650;
    }

    .host {
      display: grid;
      grid-template-columns: 112px minmax(0, 1fr);
      gap: var(--space-5);
      align-items: start;
    }

    .host-photo {
      aspect-ratio: 1;
      border-radius: var(--radius-lg);
    }

    .host h2 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .host p {
      max-width: 60ch;
      margin: var(--space-2) 0;
      color: var(--color-text-muted);
    }

    .host a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      color: var(--color-primary);
      font-weight: 700;
    }

    /* Las salidas, pegadas al bajar en escritorio */
    /* La taquilla: un panel con su cabecera de señal verde, fijo al bajar en escritorio */
    .booking {
      --notch-bg: var(--color-surface);
      position: sticky;
      top: var(--space-5);
      display: grid;
      gap: var(--space-4);
      padding: 0 var(--space-4) var(--space-4);
      overflow: hidden;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-2);
      scroll-margin-top: var(--space-5);
    }

    .booking-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-3);
      margin: 0 calc(var(--space-4) * -1);
      padding: var(--space-4);
      background: var(--sign);
      box-shadow: inset 0 0 0 3px var(--sign), inset 0 0 0 4px var(--sign-rule);
      color: #ffffff;
    }

    .booking h2 {
      font-size: 22px;
      font-weight: 850;
      letter-spacing: -0.02em;
      color: #ffffff;
    }

    .booking-from {
      font-size: var(--text-sm);
      color: rgb(255 255 255 / 0.8);
      white-space: nowrap;
    }

    .booking-from strong {
      font-size: 20px;
      font-weight: 850;
      color: #ffffff;
    }

    .cta {
      display: grid;
      gap: var(--space-2);
      padding-top: var(--space-3);
      border-top: 1px dashed var(--color-border-strong);
    }

    .mobile-bar {
      display: none;
    }

    @media (max-width: 860px) {
      .mobile-bar {
        position: fixed;
        inset: auto 0 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
        border-top: 1px solid var(--sign-rule);
        background: var(--color-band);
        box-shadow: 0 -10px 24px -12px rgb(0 0 0 / 0.6);
      }

      .mobile-bar strong {
        font-size: 18px;
        font-weight: 850;
      }

      /* Que la barra no tape lo último de la página */
      :host {
        padding-bottom: 76px;
      }
    }

    .summary {
      font-weight: 700;
    }

    .reserve {
      width: 100%;
    }

    .reserve:disabled {
      cursor: not-allowed;
      color: var(--color-text-muted);
    }

    .reserve:disabled::before {
      background: var(--color-surface-2);
    }

    .reason,
    .no-dates {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .lost {
      display: grid;
      justify-items: start;
      gap: var(--space-4);
      padding-block: var(--space-7) calc(var(--space-7) * 2);
    }

    .lost p {
      color: var(--color-on-band-muted);
    }

    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }

      .booking {
        position: static;
      }
    }

    @media (max-width: 560px) {
      .host {
        grid-template-columns: 72px minmax(0, 1fr);
        gap: var(--space-4);
      }
    }
  `,
})
export class ExperiencePageComponent {
  /** El paisaje de la galería: el de su tipo de carretera */
  protected readonly sceneOf = sceneFor;
  /** El :slug de la URL */
  readonly slug = input.required<string>();

  protected readonly store = inject(ExperienceStore);
  protected readonly booking = inject(BookingService);
  private readonly meta = inject(PageMetaStrategy);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  // Si se llegó desde otra página de la web (el Shop, con sus filtros), atrás vuelve a ella tal cual.
  // Se mira la navegación que está creando esta página: si tiene una anterior, se vino desde dentro
  private readonly cameFromSite = !!this.router.getCurrentNavigation()?.previousNavigation;

  protected readonly experience = this.store.experience;
  protected readonly unavailable = BOOKING_UNAVAILABLE;
  protected readonly price = formatPrice;
  protected readonly hours = formatHours;
  protected readonly shortDate = formatShortDate;
  protected readonly plural = plural;

  constructor() {
    effect(() => void this.store.load(this.slug()));

    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => this.store.setSelectedSlug(params.get(DEPARTURE_PARAM)));

    // El título de la pestaña y la descripción, con el nombre de la experiencia (SEO)
    effect(() => {
      if (this.store.status() === 'notFound') this.meta.set('Experiencia no encontrada');
      const experience = this.experience();
      if (!experience) return;
      const description = experience.description?.slice(0, 155) ?? `Salida guiada en moto con ${experience.host?.name ?? 'Routly'}.`;
      this.meta.set(experience.title, description);
    });
  }

  protected language(code: string): string {
    return LANGUAGES[code] ?? code.toUpperCase();
  }

  protected back(): void {
    if (this.cameFromSite) this.location.back();
    else void this.router.navigate(['/experiencias']);
  }
}
