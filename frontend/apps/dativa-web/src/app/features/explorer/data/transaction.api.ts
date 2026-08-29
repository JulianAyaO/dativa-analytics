import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ExplorerColumnId } from '../explorer-columns';
import { downloadBlob, CSV_MIME, EXCEL_MIME, rowsToCsv, rowsToExcel, toArrayBuffer } from './transaction-export';
import { mockTransactionExport, mockTransactionPage } from './mock-transactions';
import { TransactionListQuery, TransactionPage, TransactionRow } from './transaction.models';

@Injectable({ providedIn: 'root' })
export class TransactionApi {
  private readonly http = inject(HttpClient);

  async list(query: TransactionListQuery, signal?: AbortSignal): Promise<TransactionPage> {
    if (environment.useMockAuth) {
      await wait(80, signal);
      return mockTransactionPage(query);
    }

    const params = toParams(query);
    const page = await requestJson<TransactionPage>(
      this.http.get<TransactionPage>(`${environment.apiUrl}/analytics/transactions`, { params }),
      signal,
    );
    return mapPage(page);
  }

  async exportCurrent(query: TransactionListQuery, format: 'csv' | 'xlsx'): Promise<void> {
    if (environment.useMockAuth) {
      downloadGenerated(mockTransactionExport(query), query.columns, format);
      return;
    }

    const params = toParams(query).set('format', format).set('columns', query.columns.join(','));
    const body = await firstValueFrom(
      this.http.get(`${environment.apiUrl}/analytics/transactions/export`, {
        params,
        responseType: 'blob',
      }),
    );
    downloadBlob(body, format === 'csv' ? 'transacciones.csv' : 'transacciones.xlsx');
  }

  async exportSelection(
    query: TransactionListQuery,
    ids: string[],
    format: 'csv' | 'xlsx',
  ): Promise<void> {
    if (environment.useMockAuth) {
      downloadGenerated(mockTransactionExport(query, ids), query.columns, format);
      return;
    }

    const body = await firstValueFrom(
      this.http.post(
        `${environment.apiUrl}/analytics/transactions/export`,
        { format, ids, columns: query.columns },
        { responseType: 'blob' },
      ),
    );
    downloadBlob(body, format === 'csv' ? 'transacciones.csv' : 'transacciones.xlsx');
  }
}

function toParams(query: TransactionListQuery): HttpParams {
  let params = new HttpParams()
    .set('dataset', query.dataset)
    .set('page', String(query.page))
    .set('size', String(query.size))
    .set('sort', query.sort)
    .set('dir', query.dir);

  if (query.filters.period) {
    params = params.set('period', query.filters.period);
  }
  if (query.filters.region) {
    params = params.set('region', query.filters.region);
  }
  if (query.filters.category) {
    params = params.set('category', query.filters.category);
  }
  if (query.filters.product) {
    params = params.set('product', query.filters.product);
  }
  if (query.filters.seller) {
    params = params.set('seller', query.filters.seller);
  }
  if (query.search.trim()) {
    params = params.set('q', query.search.trim());
  }
  return params;
}

function mapPage(raw: TransactionPage): TransactionPage {
  return {
    ...raw,
    items: raw.items.map((item) => mapRow(item)),
  };
}

function mapRow(raw: TransactionRow): TransactionRow {
  return {
    ...raw,
    id: String(raw.id),
    occurredAt: raw.occurredAt,
    quantity: Number(raw.quantity),
    unitPrice: Number(raw.unitPrice),
    amount: Number(raw.amount),
  };
}

function downloadGenerated(rows: TransactionRow[], columns: ExplorerColumnId[], format: 'csv' | 'xlsx'): void {
  if (format === 'csv') {
    downloadBlob(new Blob([rowsToCsv(rows, columns)], { type: CSV_MIME }), 'transacciones.csv');
    return;
  }

  downloadBlob(new Blob([toArrayBuffer(rowsToExcel(rows, columns))], { type: EXCEL_MIME }), 'transacciones.xlsx');
}

function requestJson<T>(source: Observable<T>, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const subscription = source.subscribe({
      next: (value) => resolve(value as T),
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
