import { DatasetId } from '../../dashboards/widgets/widget.models';
import { ImportSchema } from './import.schema';
import { ORDERS_IMPORT_SCHEMA } from './orders-import.schema';
import { SALES_IMPORT_SCHEMA } from './sales-import.schema';

export function schemaFor(dataset: DatasetId): ImportSchema {
  return dataset === 'orders' ? ORDERS_IMPORT_SCHEMA : SALES_IMPORT_SCHEMA;
}
