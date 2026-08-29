import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Badge, Button, EmptyState, Input, Loading, Select } from '@dativa/ui';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { DashboardFilterBar } from '../../../dashboards/filters/dashboard-filter-bar';
import { DashboardFilterStore } from '../../../dashboards/filters/dashboard-filter.store';
import { DATASET_OPTIONS } from '../../../dashboards/widgets/widget.schema';
import { DatasetId } from '../../../dashboards/widgets/widget.models';
import {
  DEFAULT_EXPLORER_COLUMNS,
  EXPLORER_COLUMNS,
  ExplorerColumnId,
  SORTABLE_EXPLORER_COLUMNS,
} from '../../explorer-columns';
import { TransactionApi } from '../../data/transaction.api';
import { TransactionListQuery, TransactionRow } from '../../data/transaction.models';
import { RealtimeClient } from '../../../../core/realtime/realtime.client';
import { saleAffectsExplorer } from '../../../../core/realtime/sale-created';

const COLUMN_KEY = 'dativa.explorer.columns';

@Component({
  selector: 'dtv-explorer-page',
  imports: [Button, Badge, Input, Select, Loading, EmptyState, DashboardFilterBar],
  providers: [DashboardFilterStore],
  templateUrl: './explorer-page.html',
  styleUrl: './explorer-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorerPage {
  private readonly api = inject(TransactionApi);
  private readonly realtime = inject(RealtimeClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly filters = inject(DashboardFilterStore);

  protected readonly datasets = DATASET_OPTIONS;
  protected readonly columnsCatalog = EXPLORER_COLUMNS;
  protected readonly dataset = signal<DatasetId>(
    this.route.snapshot.queryParamMap.get('dataset') === 'orders' ? 'orders' : 'sales',
  );
  protected readonly searchInput = signal(this.route.snapshot.queryParamMap.get('q') ?? '');
  protected readonly sort = signal<ExplorerColumnId>('occurredAt');
  protected readonly dir = signal<'asc' | 'desc'>('desc');
  protected readonly page = signal(0);
  protected readonly size = 50;
  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly visible = signal<Record<ExplorerColumnId, boolean>>(readColumns());
  protected readonly columnsOpen = signal(false);
  protected readonly exporting = signal(false);
  protected readonly exportError = signal('');
  protected readonly freshData = signal(false);

  private readonly debouncedSearch = toSignal(
    toObservable(this.searchInput).pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: this.searchInput() },
  );

  protected readonly visibleColumns = computed(() =>
    this.columnsCatalog.filter((column) => this.visible()[column.id] !== false),
  );

  protected readonly query = computed((): TransactionListQuery => ({
    dataset: this.dataset(),
    filters: this.filters.value(),
    search: this.debouncedSearch(),
    sort: this.sort(),
    dir: this.dir(),
    page: this.page(),
    size: this.size,
    columns: visibleIds(this.visible()),
  }));

  protected readonly result = resource({
    params: () => this.query(),
    loader: ({ params, abortSignal }) => this.api.list(params, abortSignal),
  });

  protected readonly rows = computed(() => this.result.value()?.items ?? []);
  protected readonly total = computed(() => this.result.value()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => Math.max(1, this.result.value()?.totalPages ?? 1));
  protected readonly selectedCount = computed(() => this.selected().size);
  protected readonly allPageSelected = computed(() => {
    const rows = this.rows();
    return rows.length > 0 && rows.every((row) => this.selected().has(row.id));
  });
  protected readonly rangeLabel = computed(() => {
    const total = this.total();
    if (total === 0) {
      return '0 resultados';
    }

    const from = this.page() * this.size + 1;
    const to = Math.min(total, from + this.rows().length - 1);
    return `${from}–${to} de ${total}`;
  });
  protected readonly errorMessage = computed(() => {
    const error = this.result.error();
    if (!error) {
      return '';
    }

    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: unknown } | null;
      return typeof body?.message === 'string' && body.message
        ? body.message
        : 'No se pudieron cargar las transacciones.';
    }

    return error instanceof Error ? error.message : 'No se pudieron cargar las transacciones.';
  });

  constructor() {
    this.hydrate(this.route.snapshot.queryParamMap);

    let skipReset = true;
    let primedSales = false;
    let seenSale = 0;
    effect(() => {
      this.dataset();
      this.debouncedSearch();
      this.sort();
      this.dir();
      this.filters.value();
      if (skipReset) {
        skipReset = false;
        return;
      }
      untracked(() => {
        this.page.set(0);
        this.selected.set(new Set());
        this.freshData.set(false);
      });
    });

    effect(() => {
      const event = this.realtime.event();
      const query = this.query();
      if (!primedSales) {
        primedSales = true;
        seenSale = event?.seq ?? 0;
        return;
      }
      if (!event || event.seq === seenSale) {
        return;
      }
      seenSale = event.seq;
      const alreadyListed = untracked(() => this.rows().some((row) => row.id === event.sale.id));
      if (
        !alreadyListed &&
        saleAffectsExplorer(event.sale, query.dataset, query.filters, query.search)
      ) {
        untracked(() => this.freshData.set(true));
      }
    });

    effect(() => {
      const filters = this.filters.value();
      void this.router.navigate([], {
        relativeTo: this.route,
        replaceUrl: true,
        queryParams: {
          dataset: this.dataset(),
          period: filters.period || null,
          region: filters.region || null,
          category: filters.category || null,
          product: filters.product || null,
          seller: filters.seller || null,
          q: this.debouncedSearch() || null,
          sort: this.sort(),
          dir: this.dir(),
          page: this.page() || null,
        },
      });
    });
  }

  protected onSearch(value: string): void {
    this.searchInput.set(value);
  }

  protected onDataset(value: string): void {
    this.dataset.set(value === 'orders' ? 'orders' : 'sales');
  }

  protected toggleSort(column: ExplorerColumnId): void {
    if (!SORTABLE_EXPLORER_COLUMNS.includes(column)) {
      return;
    }

    if (this.sort() === column) {
      this.dir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sort.set(column);
    this.dir.set(column === 'occurredAt' || column === 'amount' || column === 'quantity' || column === 'unitPrice' ? 'desc' : 'asc');
  }

  protected toggleColumns(event: Event): void {
    event.stopPropagation();
    this.columnsOpen.update((open) => !open);
  }

  protected toggleColumn(id: ExplorerColumnId): void {
    this.visible.update((current) => {
      const next = { ...current, [id]: !current[id] };
      if (!visibleIds(next).length) {
        return current;
      }
      writeColumns(next);
      return next;
    });
  }

  protected toggleRow(id: string): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected togglePage(): void {
    const rows = this.rows();
    this.selected.update((current) => {
      const next = new Set(current);
      const all = rows.every((row) => next.has(row.id));
      for (const row of rows) {
        if (all) {
          next.delete(row.id);
        } else {
          next.add(row.id);
        }
      }
      return next;
    });
  }

  protected previousPage(): void {
    this.page.update((page) => Math.max(0, page - 1));
  }

  protected nextPage(): void {
    this.page.update((page) => Math.min(this.totalPages() - 1, page + 1));
  }

  protected async exportFile(format: 'csv' | 'xlsx'): Promise<void> {
    this.exportError.set('');
    this.exporting.set(true);
    try {
      const ids = [...this.selected()];
      if (ids.length > 0) {
        await this.api.exportSelection(this.query(), ids, format);
        return;
      }

      await this.api.exportCurrent(this.query(), format);
    } catch (error) {
      this.exportError.set(
        error instanceof Error ? error.message : 'No se pudo exportar la consulta.',
      );
    } finally {
      this.exporting.set(false);
    }
  }

  protected reload(): void {
    this.freshData.set(false);
    this.result.reload();
  }

  protected isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  protected sortLabel(column: ExplorerColumnId): string {
    if (this.sort() !== column) {
      return '';
    }
    return this.dir() === 'asc' ? '↑' : '↓';
  }

  protected ariaSort(column: ExplorerColumnId): 'ascending' | 'descending' | 'none' {
    if (this.sort() !== column) {
      return 'none';
    }
    return this.dir() === 'asc' ? 'ascending' : 'descending';
  }

  protected sortButtonLabel(column: { id: ExplorerColumnId; label: string }): string {
    const current = this.ariaSort(column.id);
    if (current === 'none') {
      return `Ordenar por ${column.label}`;
    }
    const next = current === 'ascending' ? 'descendente' : 'ascendente';
    return `${column.label}, orden ${current === 'ascending' ? 'ascendente' : 'descendente'}. Cambiar a ${next}`;
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(value),
    );
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected datasetLabel(value: TransactionRow['dataset']): string {
    return value === 'orders' ? 'Pedidos' : 'Ventas';
  }

  protected cell(row: TransactionRow, column: ExplorerColumnId): string {
    switch (column) {
      case 'occurredAt':
        return this.formatDate(row.occurredAt);
      case 'dataset':
        return this.datasetLabel(row.dataset);
      case 'unitPrice':
      case 'amount':
        return this.formatMoney(row[column]);
      default:
        return String(row[column]);
    }
  }

  @HostListener('document:click')
  protected closeColumns(): void {
    this.columnsOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.columnsOpen.set(false);
  }

  private hydrate(params: ParamMap): void {
    const dataset = params.get('dataset');
    this.dataset.set(dataset === 'orders' ? 'orders' : 'sales');
    this.searchInput.set(params.get('q') ?? '');
    const sort = params.get('sort') as ExplorerColumnId | null;
    if (sort && SORTABLE_EXPLORER_COLUMNS.includes(sort)) {
      this.sort.set(sort);
    }
    const dir = params.get('dir');
    if (dir === 'asc' || dir === 'desc') {
      this.dir.set(dir);
    }
    const page = Number(params.get('page') ?? '0');
    this.page.set(Number.isFinite(page) && page > 0 ? page : 0);
    const period = params.get('period');
    this.filters.hydrate({
      period:
        period === 'last_7_days' || period === 'last_30_days' || period === 'last_12_months'
          ? period
          : 'last_12_months',
      region: params.get('region') ?? '',
      category: params.get('category') ?? '',
      product: params.get('product') ?? '',
      seller: params.get('seller') ?? '',
    });
  }
}

function visibleIds(visible: Record<ExplorerColumnId, boolean>): ExplorerColumnId[] {
  return DEFAULT_EXPLORER_COLUMNS.filter((id) => visible[id] !== false);
}

function readColumns(): Record<ExplorerColumnId, boolean> {
  const fallback = Object.fromEntries(DEFAULT_EXPLORER_COLUMNS.map((id) => [id, true])) as Record<
    ExplorerColumnId,
    boolean
  >;
  const raw = localStorage.getItem(COLUMN_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    return { ...fallback, ...(JSON.parse(raw) as Record<ExplorerColumnId, boolean>) };
  } catch {
    return fallback;
  }
}

function writeColumns(value: Record<ExplorerColumnId, boolean>): void {
  localStorage.setItem(COLUMN_KEY, JSON.stringify(value));
}
