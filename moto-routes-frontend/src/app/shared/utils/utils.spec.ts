import { signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { fromLocalInput, toLocalInput } from './dates';
import { applyServerErrors, controlErrorMessage } from './form-errors';
import { formatDateTime, formatMoney, formatNumber, formatRelativeTime } from './format';
import {
  CollectionLabels,
  countLabel,
  newLabel,
  statusFilterLabels,
  statusWord,
} from './labels';
import { createPager } from './pager';
import { notBlank } from './validators';

describe('format', () => {
  // Intl separa con espacios no rompibles: se comparan como espacios normales.
  const plain = (text: string): string => text.replace(/\s/g, ' ');

  it('formatNumber usa el formato español y como mucho dos decimales', () => {
    expect(formatNumber(1234567.891)).toBe('1.234.567,89');
    expect(formatNumber(0.25)).toBe('0,25');
    expect(formatNumber(7)).toBe('7');
  });

  it('formatRelativeTime expresa el tiempo transcurrido', () => {
    const now = new Date('2026-10-07T12:00:00.000Z');
    expect(formatRelativeTime('2026-10-07T11:59:40.000Z', now)).toBe('ahora mismo');
    expect(plain(formatRelativeTime('2026-10-07T10:00:00.000Z', now))).toBe('hace 2 h');
    expect(plain(formatRelativeTime('2026-10-06T12:00:00.000Z', now))).toBe('ayer');
  });

  it('formatRelativeTime pasa a la fecha cuando ha pasado más de un mes', () => {
    const now = new Date('2026-10-07T12:00:00.000Z');
    expect(plain(formatRelativeTime('2026-01-15T12:00:00.000Z', now))).toContain('2026');
  });

  it('formatMoney escribe el precio en euros con dos decimales', () => {
    expect(plain(formatMoney(12345.5))).toBe('12.345,50 €');
    expect(plain(formatMoney(0))).toBe('0,00 €');
  });

  it('formatDateTime incluye la fecha y la hora local', () => {
    const local = new Date(2026, 8, 30, 10, 5).toISOString();
    const text = plain(formatDateTime(local));
    expect(text).toContain('2026');
    expect(text).toContain('10:05');
  });
});

describe('dates', () => {
  it('toLocalInput y fromLocalInput van y vuelven sin perder la hora', () => {
    const iso = '2026-11-08T08:30:00.000Z';
    const local = toLocalInput(iso);

    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(fromLocalInput(local)).toBe(iso);
  });
});

describe('labels', () => {
  const routes: CollectionLabels = { singular: 'ruta', plural: 'rutas', gender: 'f' };
  const users: CollectionLabels = { singular: 'usuario', plural: 'usuarios', gender: 'm' };

  it('concierta el estado con el género de la colección', () => {
    expect(statusWord('active', 'f')).toBe('activa');
    expect(statusWord('inactive', 'm')).toBe('inactivo');
    expect(statusWord('deleted', 'f')).toBe('eliminada');
  });

  it('countLabel usa el singular solo para uno', () => {
    expect(countLabel(1, routes)).toBe('1 ruta');
    expect(countLabel(0, routes)).toBe('0 rutas');
    expect(countLabel(5, users)).toBe('5 usuarios');
  });

  it('newLabel y statusFilterLabels', () => {
    expect(newLabel(routes)).toBe('Nueva ruta');
    expect(newLabel(users)).toBe('Nuevo usuario');
    expect(statusFilterLabels('f')).toEqual({ all: 'Todas', active: 'Activas', inactive: 'Inactivas' });
    expect(statusFilterLabels('m')).toEqual({ all: 'Todos', active: 'Activos', inactive: 'Inactivos' });
  });
});

describe('pager', () => {
  const numbers = (count: number): number[] => Array.from({ length: count }, (_, index) => index);

  it('corta la página actual', () => {
    const rows = signal(numbers(30));
    const pager = createPager(rows, () => 'todos', 12);

    expect(pager.items()).toEqual(numbers(12));
    pager.page.set(3);
    expect(pager.items()).toEqual([24, 25, 26, 27, 28, 29]);
    expect(pager.total()).toBe(30);
  });

  it('vuelve a la página 1 al cambiar el filtro', () => {
    const rows = signal(numbers(30));
    const key = signal('todos');
    const pager = createPager(rows, key, 12);

    pager.page.set(2);
    key.set('activos');

    expect(pager.page()).toBe(1);
  });

  it('no se queda en una página que ya no existe', () => {
    const rows = signal(numbers(30));
    const pager = createPager(rows, () => 'todos', 12);

    pager.page.set(3);
    rows.set(numbers(13));

    expect(pager.page()).toBe(2);
    expect(pager.items()).toEqual([12]);
  });
});

describe('validators', () => {
  it('notBlank rechaza un texto vacío o solo con espacios', () => {
    expect(notBlank(new FormControl(''))).toEqual({ required: true });
    expect(notBlank(new FormControl('   '))).toEqual({ required: true });
    expect(notBlank(new FormControl(' a '))).toBeNull();
  });
});

describe('form-errors', () => {
  it('controlErrorMessage describe los validadores de Angular', () => {
    expect(controlErrorMessage(new FormControl('', Validators.required))).toBe(
      'Este campo es obligatorio.',
    );
    expect(controlErrorMessage(new FormControl('abcdef', Validators.maxLength(3)))).toBe(
      'Escribe como máximo 3 caracteres.',
    );
    expect(controlErrorMessage(new FormControl(-1, Validators.min(0)))).toBe(
      'El valor mínimo es 0.',
    );
    expect(controlErrorMessage(new FormControl('ok', Validators.required))).toBeNull();
  });

  it('applyServerErrors pone el mensaje de la API en su campo y devuelve los que sobran', () => {
    const form = new FormGroup({ title: new FormControl('Ruta') });

    const unmatched = applyServerErrors(form, {
      title: 'Ya existe.',
      id: 'El formato no es válido.',
    });

    expect(controlErrorMessage(form.controls.title)).toBe('Ya existe.');
    expect(form.controls.title.touched).toBeTrue();
    expect(unmatched).toEqual({ id: 'El formato no es válido.' });
  });

  it('el error de la API desaparece cuando el usuario cambia el valor', () => {
    const form = new FormGroup({ title: new FormControl('Ruta') });
    applyServerErrors(form, { title: 'Ya existe.' });

    form.controls.title.setValue('Otra ruta');

    expect(controlErrorMessage(form.controls.title)).toBeNull();
  });
});
