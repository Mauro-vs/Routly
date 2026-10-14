import { FormControl, FormGroup, Validators } from '@angular/forms';

import { applyServerErrors, controlErrorMessage } from './form-errors';
import { formatNumber, formatRelativeTime } from './format';
import { matchesQuery, normalizeText } from './text';
import { notBlank } from './validators';

describe('text', () => {
  it('normalizeText quita tildes, mayúsculas y espacios de sobra', () => {
    expect(normalizeText('  Logroño ')).toBe('logrono');
    expect(normalizeText('SÓLLER')).toBe('soller');
  });

  it('matchesQuery encuentra coincidencias parciales', () => {
    expect(matchesQuery('Sierra Nevada Express', 'nevada')).toBeTrue();
    expect(matchesQuery('Sierra Nevada Express', 'pirineos')).toBeFalse();
  });
});

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
