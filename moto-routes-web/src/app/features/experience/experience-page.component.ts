import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ChatStore } from '../../layout/ai-chat/chat.store';
import { BOOKING_UNAVAILABLE, BookingService } from '../../core/booking/booking.service';
import { PageMetaStrategy } from '../../core/services/page-meta.strategy';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { sceneFor } from '../../shared/ui/photo/landscape';
import { PhotoComponent } from '../../shared/ui/photo/photo.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { formatHours, formatPrice, formatRating, formatShortDate, plural } from '../../shared/utils/shop-format';
import { StarsComponent } from '../../shared/ui/stars/stars.component';
import { ReviewsSectionComponent } from '../reviews/reviews-section.component';
import { AiInsightsComponent } from './components/ai-insights/ai-insights.component';
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
  imports: [
    RouterLink,
    GalleryComponent,
    RouteSignComponent,
    DeparturePickerComponent,
    PhotoComponent,
    SkeletonComponent,
    IconComponent,
    AiInsightsComponent,
    StarsComponent,
    ReviewsSectionComponent,
  ],
  providers: [ExperienceStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experience-page.component.html',
  styleUrl: './experience-page.component.css',
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
  protected readonly rating = formatRating;

  constructor() {
    effect(() => void this.store.load(this.slug()));

    // El asistente (en el armazón) sabe de qué experiencia se habla mientras se ve su ficha
    const chat = inject(ChatStore);
    effect(() => {
      const experience = this.experience();
      chat.setContext(experience ? { slug: experience.slug, title: experience.title } : null);
    });
    inject(DestroyRef).onDestroy(() => chat.setContext(null));

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
