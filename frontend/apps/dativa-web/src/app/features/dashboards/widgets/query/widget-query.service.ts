import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { familyForWidget } from '../widget.registry';
import { runWidgetQuery } from './mock-analytics';
import { withImportedOverlay } from './overlay-analytics';
import { mapWidgetResult } from './widget-result.mapper';
import { WidgetQuery, WidgetResult } from './widget-query.models';

@Injectable({ providedIn: 'root' })
export class WidgetQueryService {
  private readonly http = inject(HttpClient);

  async execute(query: WidgetQuery, signal?: AbortSignal): Promise<WidgetResult> {
    if (environment.useMockAuth) {
      await wait(90, signal);
      return withImportedOverlay(runWidgetQuery(query), query);
    }

    const family = familyForWidget(query.type);

    try {
      const raw = await postJson(`${environment.apiUrl}/analytics/query`, query, this.http, signal);
      return mapWidgetResult(raw, query);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      if (error instanceof HttpErrorResponse && error.status === 400) {
        return {
          status: 'error',
          query,
          family,
          message: readApiMessage(error),
        };
      }

      throw error;
    }
  }
}

function postJson(
  url: string,
  body: unknown,
  http: HttpClient,
  signal?: AbortSignal,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const subscription = http.post<unknown>(url, body).subscribe({
      next: resolve,
      error: reject,
    });

    const abort = () => {
      subscription.unsubscribe();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signal?.aborted) {
      abort();
      return;
    }

    signal?.addEventListener('abort', abort, { once: true });
  });
}

function readApiMessage(error: HttpErrorResponse): string {
  const body = error.error as { message?: unknown } | null;
  return typeof body?.message === 'string' && body.message
    ? body.message
    : 'No se pudieron cargar los datos del widget.';
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = globalThis.setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        globalThis.clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}
