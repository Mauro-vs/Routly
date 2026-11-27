import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiReviewsSummary } from '../../../../core/ai/ai.models';
import { ReviewsStore } from '../../reviews.store';
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

// El componente solo pinta lo que tiene el store (la petición y sus reglas, en reviews.store.spec.ts)
describe('ReviewsAiSummaryComponent', () => {
  const aiSummary = signal<AiReviewsSummary | null>(null);
  const aiLoading = signal(false);
  let loadAiSummary: jasmine.Spy;

  async function render(): Promise<HTMLElement> {
    loadAiSummary = jasmine.createSpy('loadAiSummary').and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ReviewsStore, useValue: { aiSummary, aiLoading, summary: signal(null), loadAiSummary } },
      ],
    });
    const fixture: ComponentFixture<ReviewsAiSummaryComponent> = TestBed.createComponent(ReviewsAiSummaryComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    aiSummary.set(null);
    aiLoading.set(false);
  });

  it('pide el resumen al store y enseña lo que gusta, lo que se puede mejorar y los temas', async () => {
    aiSummary.set(SUMMARY);
    const element = await render();

    expect(loadAiSummary).toHaveBeenCalled();
    expect(element.textContent).toContain('Routly IA ha resumido 12 opiniones');
    expect(element.querySelector('.summary')?.textContent).toContain('Gustan mucho');
    expect(element.textContent).toContain('Lo que más gusta');
    expect(element.textContent).toContain('Lo que se puede mejorar');
    const topics = [...element.querySelectorAll('.topic')];
    expect(topics.map((topic) => topic.className)).toEqual(['topic positive', 'topic negative']);
    expect(element.textContent).toContain('Resumen generado con IA a partir de las opiniones');
  });

  it('sin quejas, no sale la columna de lo que se puede mejorar', async () => {
    aiSummary.set({ ...SUMMARY, cons: [] });
    const element = await render();
    expect(element.textContent).not.toContain('Lo que se puede mejorar');
  });

  it('mientras la IA escribe, un esqueleto', async () => {
    aiLoading.set(true);
    const element = await render();
    expect(element.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(element.textContent).toContain('leyendo las opiniones');
  });

  it('sin resumen (pocas opiniones, sin IA o si falla), no sale nada', async () => {
    const element = await render();
    expect(element.textContent?.trim()).toBe('');
  });
});
