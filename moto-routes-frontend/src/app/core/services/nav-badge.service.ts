import { Injectable, signal } from '@angular/core';

/**
 * Contadores que se muestran junto a cada sección del menú.
 * Cada feature publica el suyo con el `id` de su sección; el layout solo los lee,
 * así no necesita importar nada de las features.
 */
@Injectable({ providedIn: 'root' })
export class NavBadgeService {
  private readonly counts = signal<Readonly<Record<string, number>>>({});

  count(sectionId: string): number | null {
    return this.counts()[sectionId] ?? null;
  }

  set(sectionId: string, count: number): void {
    if (this.counts()[sectionId] === count) return;
    this.counts.update((counts) => ({ ...counts, [sectionId]: count }));
  }
}
