import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button, EmptyState, Loading } from '@dativa/ui';
import { AuthStore } from '../../../../core/auth/auth.store';
import { Dashboard } from '../../models/dashboard.models';
import { DashboardApi } from '../../data/dashboard.api';
import { DashboardCanvas } from '../../components/dashboard-canvas/dashboard-canvas';
import { DashboardFilterStore } from '../../filters/dashboard-filter.store';
import { DashboardFilterBar } from '../../filters/dashboard-filter-bar';
import { ExplorerQuery, explorerQueryParams } from '../../../explorer/explorer-query';
import { TransactionApi } from '../../../explorer/data/transaction.api';
import { DEFAULT_EXPLORER_COLUMNS } from '../../../explorer/explorer-columns';

@Component({
  selector: 'dtv-dashboard-view-page',
  imports: [Button, EmptyState, Loading, DashboardCanvas, DashboardFilterBar],
  providers: [DashboardFilterStore],
  templateUrl: './dashboard-view-page.html',
  styleUrl: './dashboard-view-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardViewPage {
  private readonly api = inject(DashboardApi);
  private readonly transactions = inject(TransactionApi);
  private readonly router = inject(Router);
  protected readonly filters = inject(DashboardFilterStore);
  protected readonly auth = inject(AuthStore);

  readonly id = input.required<string>();

  protected readonly status = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  protected readonly dashboard = signal<Dashboard | null>(null);
  protected readonly exporting = signal(false);

  constructor() {
    effect(() => {
      const id = this.id();
      void this.load(id);
    });
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/dashboards');
  }

  protected openEditor(): void {
    const dashboard = this.dashboard();
    if (dashboard && this.auth.canEdit()) {
      void this.router.navigate(['/dashboards', dashboard.id, 'edit']);
    }
  }

  protected openExplorer(query: ExplorerQuery): void {
    void this.router.navigate(['/explorer'], { queryParams: explorerQueryParams(query) });
  }

  protected async exportAnalysis(): Promise<void> {
    const dashboard = this.dashboard();
    if (!dashboard || this.exporting()) {
      return;
    }
    this.exporting.set(true);
    try {
      const dataset = dashboard.widgets[0]?.config.dataset === 'orders' ? 'orders' : 'sales';
      await this.transactions.exportCurrent(
        {
          dataset,
          filters: this.filters.value(),
          search: '',
          sort: 'occurredAt',
          dir: 'desc',
          page: 0,
          size: 50,
          columns: [...DEFAULT_EXPLORER_COLUMNS],
        },
        'xlsx',
      );
    } finally {
      this.exporting.set(false);
    }
  }

  private async load(id: string): Promise<void> {
    this.status.set('loading');
    try {
      const dashboard = await this.api.getById(id);

      if (!dashboard) {
        this.dashboard.set(null);
        this.filters.hydrate(null);
        this.status.set('missing');
        return;
      }

      this.dashboard.set(dashboard);
      this.filters.hydrate(dashboard.filters);
      this.status.set('ready');
      void this.api.incrementOpen(id);
    } catch {
      this.dashboard.set(null);
      this.filters.hydrate(null);
      this.status.set('error');
    }
  }

  protected retry(): void {
    void this.load(this.id());
  }
}
