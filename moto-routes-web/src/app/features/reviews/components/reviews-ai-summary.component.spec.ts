import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiApiService, AiError } from '../../../core/ai/ai-api.service';
import { AiReviewsSummary } from '../../../core/ai/ai.models';
import { ReviewsAiSummaryComponent } from './reviews-ai-summary.component';

const SUMMARY: AiReviewsSummary = {
  summary: 'Gustan mucho las calas y el ritmo del guía.',
  pros: ['Calas preciosas', 'Guía atento'],
  cons: ['La parada para comer es corta'],
  topics: [
    { name: 'Paisaje', sentiment: 'positive', mentions: 8 },
    { name: 'Comida', sentiment: 'negative', mentions: 2 },
  ],
  basedOn: 12,
  model: 'openai/gpt-oss-120b',
  generatedAt: '2026-11-26T10:00:00.000Z',
};

describe('ReviewsAiSummaryComponent', () => {
  let reviewsSummary: jasmine.Spy;

  function create(count = 12): ComponentFixture<ReviewsAiSummaryComponent> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: AiApiService, useValue: { reviewsSummary } }],
    });
    const fixture = TestBed.createComponent(ReviewsAiSummaryComponent);
    fixture.componentRef.setInput('type', 'experience');
    fixture.componentRef.setInput('slug', 'calas-de-mallorca');
    fixture.componentRef.setInput('count', count);
    return fixture;
  }

  async function settle(fixture: ComponentFixture<ReviewsAiSummaryComponent>): Promise<HTMLElement> {
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('enseña el resumen, lo que gusta, lo que se puede mejorar y los temas', async () => {
    reviewsSummary = jasmine.createSpy().and.resolveTo(SUMMARY);
    const element = await settle(create());

    expect(reviewsSummary).toHaveBeenCalledWith('experience', 'calas-de-mallorca', jasmine.any(AbortSignal));
    expect(element.textContent).toContain('Routly IA ha resumido 12 opiniones');
    expect(element.querySelector('.summary')?.textContent).toContain('Gustan mucho');
    expect(element.textContent).toContain('Lo que más gusta');
    expect(element.textContent).toContain('Lo que se puede mejorar');
    const topics = [...element.querySelectorAll('.topic')];
    expect(topics.map((topic) => topic.className)).toEqual(['topic positive', 'topic negative']);
    expect(element.textContent).toContain('Resumen generado con IA a partir de las opiniones');
  });

  it('sin quejas, no sale la columna de lo que se puede mejorar', async () => {
    reviewsSummary = jasmine.createSpy().and.resolveTo({ ...SUMMARY, cons: [] });
    const element = await settle(create());
    expect(element.textContent).not.toContain('Lo que se puede mejorar');
  });

  it('mientras la IA escribe, un esqueleto', async () => {
    reviewsSummary = jasmine.createSpy().and.returnValue(new Promise(() => undefined));
    const fixture = create();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(element.textContent).toContain('leyendo las opiniones');
  });

  it('con menos de 3 opiniones ni se pide', async () => {
    reviewsSummary = jasmine.createSpy();
    const element = await settle(create(2));
    expect(reviewsSummary).not.toHaveBeenCalled();
    expect(element.textContent?.trim()).toBe('');
  });

  it('si no hay bastantes con comentario (null), no sale nada', async () => {
    reviewsSummary = jasmine.createSpy().and.resolveTo(null);
    const element = await settle(create());
    expect(element.textContent?.trim()).toBe('');
  });

  it('si la IA falla o no está, no sale nada (las opiniones se ven igual)', async () => {
    reviewsSummary = jasmine.createSpy().and.rejectWith(new AiError('AI is not configured', 503));
    const element = await settle(create());
    expect(element.textContent?.trim()).toBe('');
  });
});
