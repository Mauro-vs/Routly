import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { StatusBadgeComponent, statusBadge } from './status-badge.component';

describe('statusBadge', () => {
  it('concierta el estado de un registro con su género', () => {
    expect(statusBadge('active', 'f').label).toBe('Activa');
    expect(statusBadge('active', 'm').label).toBe('Activo');
    expect(statusBadge('inactive', 'm').label).toBe('Inactivo');
  });

  it('usa las etiquetas del estado de una salida', () => {
    expect(statusBadge('scheduled', 'f')).toEqual({
      label: 'Programada',
      icon: 'calendar-blank',
      tone: 'badge--info',
    });
    expect(statusBadge('cancelled', 'f').label).toBe('Cancelada');
    expect(statusBadge('completed', 'f').label).toBe('Realizada');
  });

  it('cada estado lleva un icono propio, no solo un color', () => {
    const icons = (['active', 'inactive', 'scheduled', 'cancelled', 'completed'] as const).map(
      (status) => statusBadge(status, 'f').icon,
    );
    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe('StatusBadgeComponent', () => {
  it('pinta el texto y el color del estado', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('status', 'inactive');
    fixture.componentRef.setInput('gender', 'f');
    await fixture.whenStable();

    const badge: HTMLElement = fixture.nativeElement.querySelector('.badge');
    expect(badge.textContent?.trim()).toBe('Inactiva');
    expect(badge.classList).toContain('badge--off');
    expect(badge.classList).toContain('badge--icon');
  });
});
