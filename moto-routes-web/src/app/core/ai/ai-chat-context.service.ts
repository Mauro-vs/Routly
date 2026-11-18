import { Injectable, signal } from '@angular/core';

/** La experiencia de la que va el chat: la del detalle que se está viendo. */
export interface ChatContext {
  slug: string;
  title: string;
}

/**
 * Lo que comparten el detalle y el chat flotante (que vive en el armazón, fuera de la página): de
 * qué experiencia va la conversación y la orden de abrirlo ("Pregúntale al asistente").
 */
@Injectable({ providedIn: 'root' })
export class AiChatContextService {
  readonly context = signal<ChatContext | null>(null);
  readonly open = signal(false);
  /** Una pregunta para mandar nada más abrir (desde el bloque Routly IA) */
  readonly pendingQuestion = signal<string | null>(null);

  set(context: ChatContext | null): void {
    this.context.set(context);
  }

  /** Abre el chat y, si se le da, manda esa pregunta. */
  ask(question?: string): void {
    this.pendingQuestion.set(question ?? null);
    this.open.set(true);
  }
}
