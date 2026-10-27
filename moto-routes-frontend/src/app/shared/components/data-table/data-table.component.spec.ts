import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DataTableComponent, TableCellDirective } from './data-table.component';

interface Row {
  id: string;
  name: string;
}

@Component({
  imports: [DataTableComponent, TableCellDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-data-table caption="Filas" [columns]="columns" [rows]="rows()" [rowKey]="key">
      <ng-template uiCell="name" [uiCellOf]="rows()" let-row>{{ row.name }}</ng-template>
    </ui-data-table>
  `,
})
class HostComponent {
  readonly columns = [{ key: 'name', header: 'Nombre' }];
  readonly rows = signal<Row[]>([]);
  readonly key = (row: Row): string => row.id;
}

const rows = (count: number, from = 0): Row[] =>
  Array.from({ length: count }, (_, index) => ({ id: String(from + index), name: `Fila ${from + index}` }));

describe('DataTableComponent', () => {
  async function render(initial: Row[]) {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.rows.set(initial);
    await fixture.whenStable();
    return fixture;
  }

  it('cada fila entra con su retraso escalonado, con un tope para listas largas', async () => {
    const fixture = await render(rows(10));
    const delays = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody tr.row'),
    ).map((tr) => tr.style.getPropertyValue('--row'));

    expect(delays).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '8']);
  });

  it('al filtrar, las filas que siguen no se vuelven a crear (y no se animan otra vez)', async () => {
    const fixture = await render(rows(3));
    const element: HTMLElement = fixture.nativeElement;
    const before = element.querySelectorAll('tbody tr.row')[1];

    fixture.componentInstance.rows.set(rows(2, 1));
    await fixture.whenStable();

    expect(element.querySelectorAll('tbody tr.row')[0]).toBe(before);
    expect(element.querySelectorAll('tbody tr.row').length).toBe(2);
  });
});
