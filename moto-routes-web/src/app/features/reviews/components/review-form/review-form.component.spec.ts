import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewsStore } from '../../reviews.store';
import { review } from '../../testing/reviews.fixtures';
import { ReviewFormComponent, commentRule } from './review-form.component';

describe('ReviewFormComponent', () => {
  let fixture: ComponentFixture<ReviewFormComponent>;
  let form: ReviewFormComponent;
  let api: jasmine.SpyObj<ReviewsStore>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<ReviewsStore>('ReviewsStore', ['create', 'update', 'uploadPhoto', 'removePhoto']);
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ReviewsStore, useValue: api }],
    });
    fixture = TestBed.createComponent(ReviewFormComponent);
    fixture.componentRef.setInput('type', 'experience');
    fixture.componentRef.setInput('targetId', 'e1');
    form = fixture.componentInstance;
    await fixture.whenStable();
  });

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const submit = (): HTMLButtonElement => element().querySelector('button[type="submit"]') as HTMLButtonElement;
  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('el comentario es opcional con 3 a 5 estrellas y obligatorio (30) con 1 o 2', () => {
    expect(commentRule(4)).toEqual({ required: false, min: 10 });
    expect(commentRule(3).required).toBeFalse();
    expect(commentRule(2)).toEqual({ required: true, min: 30 });
    expect(commentRule(1).required).toBeTrue();
  });

  it('sin estrellas no se puede enviar; con 4 y sin comentario, sí', async () => {
    await render();
    expect(submit().disabled).toBeTrue();
    form.rating.set(4);
    await render();
    expect(submit().disabled).toBeFalse();
    expect(element().textContent).toContain('(opcional)');
  });

  it('al marcar 1 estrella el comentario pasa a obligatorio al momento, con su explicación', async () => {
    form.rating.set(1);
    await render();
    expect(submit().disabled).toBeTrue();
    expect(element().textContent).toContain('(obligatorio)');
    expect(element().textContent).toContain('Cuéntanos qué ha fallado para que otros riders y el guía puedan entenderlo');
    expect(element().querySelector('textarea')?.getAttribute('aria-invalid')).toBe('true');

    form.comment.set('Corto, no llega');
    await render();
    expect(submit().disabled).toBeTrue();

    form.comment.set('Salimos con una hora de retraso y el guía no esperaba.');
    await render();
    expect(submit().disabled).toBeFalse();
    expect(element().querySelector('textarea')?.getAttribute('aria-invalid')).toBe('false');
  });

  it('un comentario de menos de 10 caracteres no vale tampoco con 5 estrellas (o se deja vacío)', async () => {
    form.rating.set(5);
    form.comment.set('Genial');
    await render();
    expect(submit().disabled).toBeTrue();
  });

  it('las estrellas son radios con su texto, no solo iconos', async () => {
    await render();
    const radios = element().querySelectorAll<HTMLInputElement>('input[type="radio"][name="rating"]');
    expect(radios.length).toBe(5);
    expect(element().querySelector('fieldset legend')?.textContent).toContain('Tu nota');
    expect(element().textContent).toContain('1 estrella: Muy mala');
    radios[2].click();
    await render();
    expect(form.rating()).toBe(3);
  });

  it('publica la opinión y luego sube las fotos de una en una', async () => {
    const created = review('nueva', { rating: 4 });
    api.create.and.resolveTo(created);
    api.uploadPhoto.and.resolveTo(created);
    const saved = jasmine.createSpy('saved');
    form.saved.subscribe(saved);

    form.rating.set(4);
    form.newPhotos.set([
      { key: 1, preview: '', blob: new Blob(['a'], { type: 'image/webp' }), state: 'ready', error: null },
      { key: 2, preview: '', blob: new Blob(['b'], { type: 'image/webp' }), state: 'ready', error: null },
    ]);
    await form.save();

    expect(api.create).toHaveBeenCalledOnceWith('experience', 'e1', { rating: 4, title: undefined, comment: undefined });
    expect(api.uploadPhoto).toHaveBeenCalledTimes(2);
    expect(saved).toHaveBeenCalledOnceWith(created);
  });

  it('si falla una foto se dice, y al reintentar no se vuelve a crear la opinión', async () => {
    const created = review('nueva', { rating: 4 });
    api.create.and.resolveTo(created);
    api.uploadPhoto.and.rejectWith(new HttpErrorResponse({ status: 413, error: { code: 'PHOTO_TOO_LARGE' } }));
    const saved = jasmine.createSpy('saved');
    form.saved.subscribe(saved);

    form.rating.set(4);
    form.newPhotos.set([{ key: 1, preview: '', blob: new Blob(['a'], { type: 'image/webp' }), state: 'ready', error: null }]);
    await form.save();
    await render();

    expect(saved).not.toHaveBeenCalled();
    expect(form.photosFailed()).toBeTrue();
    expect(element().textContent).toContain('La foto pesa demasiado.');
    expect(submit().textContent).toContain('Reintentar las fotos');

    api.uploadPhoto.and.resolveTo(created);
    await form.save();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(saved).toHaveBeenCalledOnceWith(created);
  });

  it('los errores de la API salen en español: ya has opinado, o es tu experiencia', async () => {
    form.rating.set(5);
    api.create.and.rejectWith(new HttpErrorResponse({ status: 409, error: { code: 'REVIEW_ALREADY_EXISTS' } }));
    await form.save();
    expect(form.error()).toBe('Ya has opinado sobre esta experiencia. Puedes editar tu opinión.');

    api.create.and.rejectWith(new HttpErrorResponse({ status: 403, error: { code: 'OWN_TARGET' } }));
    await form.save();
    expect(form.error()).toBe('No puedes opinar sobre tus propias experiencias.');
  });

  it('al editar empieza con lo que había y guarda con PATCH (null vacía el comentario)', async () => {
    const fixture2 = TestBed.createComponent(ReviewFormComponent);
    fixture2.componentRef.setInput('type', 'experience');
    fixture2.componentRef.setInput('targetId', 'e1');
    fixture2.componentRef.setInput('review', review('mia', { rating: 3, title: 'Correcta', comment: 'La ruta está bien, sin más.' }));
    fixture2.detectChanges();
    const edit = fixture2.componentInstance;
    expect(edit.rating()).toBe(3);
    expect(edit.title()).toBe('Correcta');

    api.update.and.resolveTo(review('mia'));
    edit.comment.set('');
    await edit.save();
    expect(api.update).toHaveBeenCalledOnceWith('mia', { rating: 3, title: 'Correcta', comment: null });
  });
});
