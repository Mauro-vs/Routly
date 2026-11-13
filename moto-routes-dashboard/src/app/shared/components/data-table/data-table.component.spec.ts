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

  it('al filtrar, las filas que siguen no se vuelven a crear', async () => {
    const fixture = await render(rows(3));
    const element: HTMLElement = fixture.nativeElement;
    const before = element.querySelectorAll('tbody tr')[1];

    fixture.componentInstance.rows.set(rows(2, 1));
    await fixture.whenStable();

    expect(element.querySelectorAll('tbody tr')[0]).toBe(before);
    expect(element.querySelectorAll('tbody tr').length).toBe(2);
  });
});
