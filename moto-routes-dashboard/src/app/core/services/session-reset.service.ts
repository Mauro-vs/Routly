import { Injectable } from '@angular/core';

/**
 * Lo que hay que olvidar al cerrar sesión. Cada store se apunta al crearse, así uno nuevo
 * queda cubierto sin tocar nada más, y el siguiente usuario no ve los datos del anterior.
 */
@Injectable({ providedIn: 'root' })
export class SessionResetService {
  private readonly resets = new Set<() => void>();

  register(reset: () => void): void {
    this.resets.add(reset);
  }

  resetAll(): void {
    this.resets.forEach((reset) => reset());
  }
}
