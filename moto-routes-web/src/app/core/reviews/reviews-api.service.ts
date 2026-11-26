import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ShopApiService, ShopParams } from '../api/shop-api.service';
import { MyReview, Review, ReviewInput, ReviewTargetType, ReviewsPage } from './reviews.models';

/** El tramo de /api/shop de cada tipo: /experiences/:slug o /hosts/:slug */
const SHOP_PATH: Record<ReviewTargetType, string> = { experience: '/experiences', host: '/hosts' };

/**
 * Las opiniones contra la API. Leer las de una experiencia o un guía es público y va por la tienda
 * (ShopApiService, con su AbortSignal); "la mía" y escribir piden sesión: el authInterceptor manda
 * las cookies y renueva la sesión si hace falta.
 *
 * Los errores de escribir se dejan como HttpErrorResponse: el formulario los traduce
 * (features/reviews/review-errors.ts) según su status y su code.
 */
@Injectable({ providedIn: 'root' })
export class ReviewsApiService {
  private readonly shop = inject(ShopApiService);
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reviews`;

  list(type: ReviewTargetType, slug: string, params: ShopParams, signal?: AbortSignal): Promise<ReviewsPage> {
    return this.shop.get<ReviewsPage>(`${SHOP_PATH[type]}/${encodeURIComponent(slug)}/reviews`, params, signal);
  }

  async mine(type: ReviewTargetType, slug: string, signal?: AbortSignal): Promise<MyReview> {
    const { data } = await this.shop.get<{ data: MyReview }>(`${SHOP_PATH[type]}/${encodeURIComponent(slug)}/reviews/mine`, {}, signal);
    return data;
  }

  create(type: ReviewTargetType, targetId: string, input: ReviewInput): Promise<Review> {
    return firstValueFrom(this.http.post<Review>(this.base, { targetType: type, targetId, ...input }));
  }

  update(id: string, input: ReviewInput): Promise<Review> {
    return firstValueFrom(this.http.patch<Review>(`${this.base}/${id}`, input));
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.patch<null>(`${this.base}/${id}/delete`, {}));
  }

  /** Una foto ya reducida (photo-resize.ts), en el campo photo. Devuelve la opinión con sus fotos. */
  uploadPhoto(id: string, photo: Blob): Promise<Review> {
    const form = new FormData();
    form.append('photo', photo, `foto.${photo.type === 'image/webp' ? 'webp' : 'jpg'}`);
    return firstValueFrom(this.http.post<Review>(`${this.base}/${id}/photos`, form));
  }

  removePhoto(id: string, photoId: string): Promise<Review> {
    return firstValueFrom(this.http.delete<Review>(`${this.base}/${id}/photos/${photoId}`));
  }
}
