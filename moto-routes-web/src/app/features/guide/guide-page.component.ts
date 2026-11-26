import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageMetaStrategy } from '../../core/services/page-meta.strategy';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PhotoComponent } from '../../shared/ui/photo/photo.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StarsComponent } from '../../shared/ui/stars/stars.component';
import { formatRating, plural } from '../../shared/utils/shop-format';
import { ExperienceCardComponent } from '../shop/components/experience-card/experience-card.component';
import { ReviewsAiSummaryComponent } from '../reviews/components/reviews-ai-summary.component';
import { ReviewsSectionComponent } from '../reviews/reviews-section.component';
import { GuideStore } from './guide.store';

/**
 * La ficha de un guía (/guias/:slug): su foto y su biografía, sus dos notas (como guía, de sus
 * opiniones directas; y en sus experiencias, de todas las opiniones de ellas), sus experiencias
 * como en el Shop y debajo sus opiniones, con el formulario.
 */
@Component({
  selector: 'app-guide-page',
  imports: [RouterLink, PhotoComponent, SkeletonComponent, IconComponent, StarsComponent, ExperienceCardComponent, ReviewsSectionComponent, ReviewsAiSummaryComponent],
  providers: [GuideStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (store.status()) {
      @case ('notFound') {
        <section class="on-band">
          <div class="wrap lost">
            <h1>No hemos encontrado a este guía</h1>
            <p>Puede que ya no esté en Routly o que la dirección haya cambiado.</p>
            <a class="btn-primary" routerLink="/experiencias">Ver las experiencias</a>
          </div>
        </section>
      }
      @case ('error') {
        <section class="on-band">
          <div class="wrap lost" role="alert">
            <h1>No se ha podido cargar la ficha</h1>
            <p>{{ store.error() }}</p>
            <button type="button" class="btn-primary" (click)="store.load(slug())"><ui-icon name="arrows-clockwise" /> Reintentar</button>
          </div>
        </section>
      }
      @default {
        <section class="on-band head" [attr.aria-busy]="store.status() === 'loading'">
          <div class="wrap">
            @if (guide(); as guide) {
              <ui-photo class="portrait" [src]="guide.coverImage?.url ?? null" [seed]="guide.slug" alt="" />
              <div class="intro">
                <p class="kicker">Guía de Routly</p>
                <h1>{{ guide.name }}</h1>
                <ul class="scores">
                  @for (score of scores(); track score.label) {
                    <li>
                      @if (score.count > 0) {
                        <strong class="num">{{ score.average }}</strong> <ui-stars [value]="score.value" />
                        <span>{{ score.label }} · {{ score.countLabel }}</span>
                      } @else {
                        <span>{{ score.label }}: aún sin opiniones</span>
                      }
                    </li>
                  }
                </ul>
              </div>
            } @else {
              <ui-skeleton width="min(480px, 80%)" height="120px" />
            }
          </div>
        </section>

        @if (guide(); as guide) {
          <div class="wrap body">
            <p class="bio">{{ guide.biography || 'Aún no ha contado nada sobre sí mismo.' }}</p>

            <section aria-labelledby="salidas-guia">
              <h2 id="salidas-guia">Sus experiencias</h2>
              @if (guide.experiences.length > 0) {
                <ul class="cards">
                  @for (experience of guide.experiences; track experience._id) {
                    <li><app-experience-card [experience]="experience" /></li>
                  }
                </ul>
              } @else {
                <p class="muted">Ahora mismo no tiene experiencias publicadas.</p>
              }
            </section>

            <app-reviews-section type="host" [slug]="guide.slug" [targetId]="guide._id" [name]="guide.name" (changed)="store.load(slug(), { quiet: true })">
              <app-reviews-ai-summary reviews-extra type="host" [slug]="guide.slug" [count]="guide.rating.count" />
            </app-reviews-section>
          </div>
        }
      }
    }
  `,
  styles: `
    .head .wrap {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-6);
      padding-block: var(--space-7);
    }

    .portrait {
      width: 160px;
      aspect-ratio: 1;
      border-radius: var(--radius-lg);
    }

    .intro {
      display: grid;
      gap: var(--space-3);
    }

    .kicker {
      font-size: var(--text-xs);
      font-weight: 750;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-on-band-muted);
    }

    h1 {
      font-size: clamp(34px, 5vw, 56px);
      font-weight: 850;
      letter-spacing: -0.04em;
      line-height: 1;
    }

    .scores {
      display: grid;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .scores li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-on-band-muted);
    }

    .scores strong {
      font-size: 22px;
      font-weight: 850;
      color: var(--color-on-band);
    }

    .body {
      display: grid;
      gap: var(--space-7);
      padding-block: var(--space-7);
    }

    .bio {
      max-width: 65ch;
      font-size: 17px;
      line-height: 1.6;
    }

    h2 {
      margin-bottom: var(--space-4);
      font-size: 26px;
      font-weight: 850;
      letter-spacing: -0.02em;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--space-5);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .muted {
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
  `,
})
export class GuidePageComponent {
  /** El :slug de la URL */
  readonly slug = input.required<string>();

  protected readonly store = inject(GuideStore);
  private readonly meta = inject(PageMetaStrategy);
  protected readonly guide = this.store.guide;

  protected readonly scores = computed(() => {
    const guide = this.guide();
    if (!guide) return [];
    const score = (label: string, { average, count }: { average: number; count: number }) => ({
      label,
      value: average,
      average: formatRating(average),
      count,
      countLabel: plural(count, 'opinión', 'opiniones'),
    });
    return [score('como guía', guide.rating), score('en sus experiencias', guide.experiencesRating)];
  });

  constructor() {
    effect(() => void this.store.load(this.slug()));
    effect(() => {
      if (this.store.status() === 'notFound') this.meta.set('Guía no encontrado');
      const guide = this.guide();
      if (guide) this.meta.set(guide.name, guide.biography?.slice(0, 155) ?? `Salidas guiadas en moto con ${guide.name}.`);
    });
  }
}
