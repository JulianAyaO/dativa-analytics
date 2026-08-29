import { DatasetId } from '../../dashboards/widgets/widget.models';
import { DashboardFilters } from '../../dashboards/filters/dashboard-filters';
import { ExplorerColumnId } from '../explorer-columns';

export interface TransactionRow {
  id: string;
  dataset: DatasetId;
  occurredAt: string;
  region: string;
  category: string;
  product: string;
  seller: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface TransactionPage {
  items: TransactionRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface TransactionListQuery {
  dataset: DatasetId;
  filters: DashboardFilters;
  search: string;
  sort: ExplorerColumnId;
  dir: 'asc' | 'desc';
  page: number;
  size: number;
  columns: ExplorerColumnId[];
}
