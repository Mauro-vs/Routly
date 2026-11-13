import { Injectable, inject, signal } from '@angular/core';

import { SessionResetService } from './session-reset.service';

/**
 * Contadores que se muestran junto a cada sección del menú.
 * Cada feature publica el suyo con el `id` de su sección; el layout solo los lee,
 * así no necesita importar nada de las features.
 */
@Injectable({ providedIn: 'root' })
export class NavBadgeService {
  private readonly counts = signal<Readonly<Record<string, number>>>({});

  constructor() {
    inject(SessionResetService).register(() => this.counts.set({}));
  }

  count(sectionId: string): number | null {
    return this.counts()[sectionId] ?? null;
  }

  set(sectionId: string, count: number): void {
    if (this.counts()[sectionId] === count) return;
    this.counts.update((counts) => ({ ...counts, [sectionId]: count }));
  }

  /** Suma (o resta) al contador, si ya lo hay. Para un cambio sin el listado cargado. */
  adjust(sectionId: string, delta: number): void {
    const current = this.counts()[sectionId];
    if (current === undefined) return;
    this.set(sectionId, Math.max(0, current + delta));
  }
}
