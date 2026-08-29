import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DatasetId } from '../../dashboards/widgets/widget.models';
import { existingRowsForImport } from '../../explorer/data/mock-transactions';
import { TransactionRow } from '../../explorer/data/transaction.models';
import { ActivityLog } from '../../../core/activity/activity.log';
import { NotificationsApi } from '../../notifications/notifications.api';
import { appendImportedRows } from './imported-store';

@Injectable({ providedIn: 'root' })
export class ImportApi {
  private readonly http = inject(HttpClient);
  private readonly activity = inject(ActivityLog);
  private readonly notifications = inject(NotificationsApi);

  async commit(dataset: DatasetId, rows: TransactionRow[]): Promise<{ imported: number; skippedDuplicates: number }> {
    const label = dataset === 'sales' ? 'Ventas' : 'Pedidos';
    if (environment.useMockAuth) {
      const { added, skipped } = appendImportedRows(dataset, rows, existingRowsForImport(dataset));
      this.activity.record(
        'import.completed',
        'import',
        skipped > 0
          ? `Importación de ${added.length} filas en ${label}. ${skipped} duplicadas omitidas.`
          : `Importación de ${added.length} filas en ${label}.`,
      );
      this.notifications.push(
        'import_done',
        'Importación completada',
        skipped > 0
          ? `${added.length} filas importadas. ${skipped} duplicadas omitidas.`
          : `${added.length} filas importadas.`,
      );
      return { imported: added.length, skippedDuplicates: skipped };
    }

    const result = await firstValueFrom(
      this.http.post<{ imported: number; skippedDuplicates?: number }>(`${environment.apiUrl}/imports`, {
        dataset,
        rows: rows.map((row) => ({
          occurredAt: row.occurredAt,
          region: row.region,
          category: row.category,
          product: row.product,
          seller: row.seller,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          amount: row.amount,
        })),
      }),
    );
    return {
      imported: result.imported,
      skippedDuplicates: result.skippedDuplicates ?? 0,
    };
  }
}
