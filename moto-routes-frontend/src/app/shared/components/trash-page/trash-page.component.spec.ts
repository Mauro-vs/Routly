import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TrashPageComponent } from './trash-page.component';

const USERS = { singular: 'usuario', plural: 'usuarios', gender: 'm' } as const;

describe('TrashPageComponent', () => {
  async function subtitleFor(total: number, labels: object): Promise<string | undefined> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(TrashPageComponent);
    fixture.componentRef.setInput('labels', labels);
    fixture.componentRef.setInput('backPath', '/routes');
    fixture.componentRef.setInput('loaded', true);
    fixture.componentRef.setInput('total', total);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).querySelector('ui-page-header p')?.textContent?.trim();
  }

  it('cuenta los eliminados y concierta el texto', async () => {
    expect(await subtitleFor(1, { singular: 'ruta', plural: 'rutas', gender: 'f' })).toBe(
      '1 ruta eliminada. Puedes restaurarla cuando quieras.',
    );
  });

  it('en plural y en masculino', async () => {
    expect(await subtitleFor(3, USERS)).toBe(
      '3 usuarios eliminados. Puedes restaurarlos cuando quieras.',
    );
  });
});
