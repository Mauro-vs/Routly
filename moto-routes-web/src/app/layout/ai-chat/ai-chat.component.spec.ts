import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ChatEvent, ChatMessage } from '../../core/ai/ai.models';
import { ApiService, StreamError } from '../../core/api/api.service';
import { AiChatComponent } from './ai-chat.component';
import { ChatStore } from './chat.store';

type ChatCall = { messages: ChatMessage[]; experienceSlug?: string };

describe('AiChatComponent', () => {
  let api: jasmine.SpyObj<ApiService>;
  let fixture: ComponentFixture<AiChatComponent>;
  let element: HTMLElement;
  let chat: ChatStore;

  beforeEach(async () => {
    sessionStorage.clear();
    api = jasmine.createSpyObj<ApiService>('ApiService', ['stream']);
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: ApiService, useValue: api }],
    });
    chat = TestBed.inject(ChatStore);
    fixture = TestBed.createComponent(AiChatComponent);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => sessionStorage.clear());

  /** El servidor responde con estos eventos */
  function answer(events: ChatEvent[]): void {
    api.stream.and.callFake(async (_url, _body, onEvent) => {
      for (const event of events) (onEvent as (event: ChatEvent) => void)(event);
    });
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  async function ask(question: string): Promise<void> {
    const input = element.querySelector<HTMLTextAreaElement>('textarea')!;
    input.value = question;
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await settle();
  }

  const text = (selector: string): string => element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  it('el botón abre y cierra el panel', async () => {
    const launcher = element.querySelector<HTMLButtonElement>('.launcher')!;
    launcher.click();
    await fixture.whenStable();
    expect(element.querySelector('[role="dialog"]')).not.toBeNull();
    expect(launcher.getAttribute('aria-expanded')).toBe('true');

    launcher.click();
    await fixture.whenStable();
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('manda la pregunta y pinta la respuesta según llega, con sus enlaces', async () => {
    chat.open.set(true);
    await fixture.whenStable();
    answer([
      { event: 'tool', data: { name: 'buscar_experiencias', label: 'Buscando experiencias' } },
      { event: 'delta', data: { text: 'Te recomiendo **Calas de Mallorca**: ' } },
      { event: 'delta', data: { text: '[ver ficha](/experiencias/calas-de-mallorca)' } },
      { event: 'done', data: { model: 'm' } },
    ]);

    await ask('Una ruta fácil');

    const body = api.stream.calls.mostRecent().args[1] as ChatCall;
    expect(body.messages).toEqual([{ role: 'user', content: 'Una ruta fácil' }]);
    expect(body.experienceSlug).toBeUndefined();
    expect(text('.bubble.user')).toBe('Una ruta fácil');
    expect(text('.bubble.assistant strong')).toBe('Calas de Mallorca');
    expect(element.querySelector('.bubble.assistant a')?.getAttribute('href')).toBe('/experiencias/calas-de-mallorca');
    expect(element.querySelector('.status')).toBeNull();
  });

  it('en el detalle dice de qué experiencia va y la manda al servidor', async () => {
    chat.setContext({ slug: 'calas-de-mallorca', title: 'Calas de Mallorca en moto' });
    chat.open.set(true);
    await fixture.whenStable();
    answer([{ event: 'delta', data: { text: 'Hará sol.' } }]);

    expect(text('.context')).toContain('Calas de Mallorca en moto');
    await ask('¿Qué tiempo hará?');

    expect((api.stream.calls.mostRecent().args[1] as ChatCall).experienceSlug).toBe('calas-de-mallorca');
  });

  it('una pregunta pedida desde el detalle se manda al abrir', async () => {
    answer([{ event: 'delta', data: { text: 'Sí, vale.' } }]);
    chat.ask('¿Vale con el carnet A2?');
    await settle();

    expect(text('.bubble.user')).toBe('¿Vale con el carnet A2?');
    expect(text('.bubble.assistant')).toBe('Sí, vale.');
  });

  it('si falla, enseña el error y se puede reintentar', async () => {
    chat.open.set(true);
    await fixture.whenStable();
    api.stream.and.rejectWith(new StreamError(503));

    await ask('Hola');
    expect(text('.error')).toContain('no está disponible');

    answer([{ event: 'delta', data: { text: 'Hola, ¿qué buscas?' } }]);
    element.querySelector<HTMLButtonElement>('.error .link')!.click();
    await settle();

    expect(element.querySelector('.error')).toBeNull();
    expect(element.querySelectorAll('.bubble.user').length).toBe(1);
    expect(text('.bubble.assistant')).toBe('Hola, ¿qué buscas?');
  });

  it('recuerda la conversación y "Empezar de nuevo" la borra', async () => {
    chat.open.set(true);
    await fixture.whenStable();
    answer([{ event: 'delta', data: { text: 'Respuesta' } }]);
    await ask('Pregunta');

    expect(JSON.parse(sessionStorage.getItem('routly-chat:general')!)).toEqual([
      { role: 'user', content: 'Pregunta' },
      { role: 'assistant', content: 'Respuesta' },
    ]);

    element.querySelector<HTMLButtonElement>('[aria-label="Empezar de nuevo"]')!.click();
    await fixture.whenStable();
    expect(element.querySelector('.bubble')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('routly-chat:general')!)).toEqual([]);
  });
});
