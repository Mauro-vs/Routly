import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PriceRange, PriceRangeComponent } from './price-range.component';

describe('PriceRangeComponent', () => {
  let fixture: ComponentFixture<PriceRangeComponent>;
  let element: HTMLElement;
  let emitted: PriceRange[];

  async function render(value: PriceRange = { min: null, max: null }): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(PriceRangeComponent);
    fixture.componentRef.setInput('floor', 0);
    fixture.componentRef.setInput('ceiling', 400);
    fixture.componentRef.setInput('step', 10);
    fixture.componentRef.setInput('value', value);
    emitted = [];
    fixture.componentInstance.valueChange.subscribe((range) => emitted.push(range));
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  const input = (name: string) => element.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
  const label = () => element.querySelector('.value')?.textContent?.trim();

  // Mover un tirador como lo haría el usuario: input mientras arrastra, change al soltar
  async function drag(name: string, value: number, release = true): Promise<void> {
    input(name).value = String(value);
    input(name).dispatchEvent(new Event('input'));
    if (release) input(name).dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  it('sin rango, los tiradores en los extremos y "Cualquiera"', async () => {
    await render();
    expect(input('precio-min').value).toBe('0');
    expect(input('precio-max').value).toBe('400');
    expect(label()).toBe('Cualquiera');
  });

  it('enseña el rango que llega, con nombres accesibles', async () => {
    await render({ min: 40, max: 200 });
    expect(label()).toBe('40 € – 200 €');
    expect(input('precio-min').getAttribute('aria-label')).toBe('Precio mínimo');
    expect(input('precio-max').getAttribute('aria-valuetext')).toBe('200 €');
  });

  it('mientras se arrastra cambia el texto, pero solo avisa al soltar', async () => {
    await render();
    await drag('precio-max', 150, false);
    expect(label()).toBe('Hasta 150 €');
    expect(emitted).toEqual([]);

    input('precio-max').dispatchEvent(new Event('change'));
    expect(emitted).toEqual([{ min: null, max: 150 }]);
  });

  it('un extremo es "sin límite": no se envía', async () => {
    await render({ min: 40, max: 200 });
    await drag('precio-max', 400);
    expect(emitted.at(-1)).toEqual({ min: 40, max: null });
    expect(label()).toBe('Desde 40 €');
  });

  it('los tiradores no se cruzan: queda un paso entre ellos', async () => {
    await render({ min: null, max: 100 });
    await drag('precio-min', 300);
    expect(input('precio-min').value).toBe('90');
    expect(emitted.at(-1)).toEqual({ min: 90, max: 100 });
  });
});
