import { Component, computed, inject, signal } from '@angular/core';
import { Button, Card, EmptyState, Select } from '@dativa/ui';
import { DatasetId } from '../../../dashboards/widgets/widget.models';
import { environment } from '../../../../../environments/environment';
import { existingRowsForImport } from '../../../explorer/data/mock-transactions';
import { downloadBlob } from '../../../explorer/data/transaction-export';
import { ImportApi } from '../../data/import.api';
import { emptyTable, parseImportFile, validateImportFile } from '../../data/import-parse';
import {
  ColumnMapping,
  ImportFieldId,
  ImportSchema,
  emptyColumnMapping,
  missingRequiredMessage,
  suggestColumnMapping,
  toFieldMapping,
} from '../../data/import.schema';
import { schemaFor } from '../../data/import.schemas';
import { ORDERS_IMPORT_SCHEMA } from '../../data/orders-import.schema';
import { SALES_IMPORT_SCHEMA } from '../../data/sales-import.schema';
import { ValidatedImport, validateImportTable } from '../../data/import-validate';

export type ImportStep = 'file' | 'preview' | 'dataset' | 'mapping' | 'validation' | 'result';

const STEPS: { id: ImportStep; label: string }[] = [
  { id: 'file', label: 'Archivo' },
  { id: 'preview', label: 'Vista previa' },
  { id: 'dataset', label: 'Dataset' },
  { id: 'mapping', label: 'Mapeo' },
  { id: 'validation', label: 'Validación' },
  { id: 'result', label: 'Resultado' },
];

@Component({
  selector: 'dtv-import-wizard',
  imports: [Card, Button, Select, EmptyState],
  templateUrl: './import-wizard.html',
  styleUrl: './import-wizard.scss',
})
export class ImportWizard {
  private readonly api = inject(ImportApi);
  private suggestedFor: DatasetId | null = null;

  protected readonly steps = STEPS;
  protected readonly schemas = [SALES_IMPORT_SCHEMA, ORDERS_IMPORT_SCHEMA];
  protected readonly step = signal<ImportStep>('file');
  protected readonly dataset = signal<DatasetId>('sales');
  protected readonly file = signal<File | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly dragging = signal(false);
  protected readonly table = signal(emptyTable());
  protected readonly mapping = signal<ColumnMapping>({});
  protected readonly validated = signal<ValidatedImport | null>(null);
  protected readonly committing = signal(false);
  protected readonly commitError = signal<string | null>(null);
  protected readonly result = signal<{
    processed: number;
    imported: number;
    rejected: number;
    skippedDuplicates: number;
  } | null>(null);

  protected readonly schema = computed(() => schemaFor(this.dataset()));
  protected readonly previewRows = computed(() => this.table().rows.slice(0, 8));
  protected readonly fieldMapping = computed(() => toFieldMapping(this.mapping()));
  protected readonly mappingError = computed(() =>
    missingRequiredMessage(this.schema(), this.fieldMapping()),
  );
  protected readonly ignoredCount = computed(
    () => Object.values(this.mapping()).filter((field) => !field).length,
  );

  protected readonly errorCount = computed(
    () => this.validated()?.issues.filter((issue) => issue.kind === 'error').length ?? 0,
  );

  protected isDone(id: ImportStep): boolean {
    return this.steps.findIndex((item) => item.id === id) < this.steps.findIndex((item) => item.id === this.step());
  }

  protected onDataset(value: DatasetId): void {
    if (this.dataset() === value) {
      return;
    }
    this.dataset.set(value);
    this.suggestedFor = null;
    this.validated.set(null);
  }

  protected requiredLabels(schema: ImportSchema): string {
    return schema.fields.filter((field) => field.required).map((field) => field.label).join(', ');
  }

  protected onDrag(over: boolean): void {
    this.dragging.set(over);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) {
      await this.useFile(file);
    }
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      await this.useFile(file);
    }
  }

  protected setColumnMapping(header: string, fieldId: string): void {
    const next = (fieldId || '') as ImportFieldId | '';
    this.mapping.update((current) => {
      const updated: ColumnMapping = { ...current };
      if (next) {
        for (const [other, assigned] of Object.entries(updated)) {
          if (other !== header && assigned === next) {
            updated[other] = '';
          }
        }
      }
      updated[header] = next;
      return updated;
    });
  }

  protected goPreview(): void {
    this.step.set('preview');
  }

  protected goDataset(): void {
    this.step.set('dataset');
  }

  protected goMapping(): void {
    if (this.suggestedFor !== this.dataset()) {
      this.mapping.set(suggestColumnMapping(this.schema(), this.table().headers));
      this.suggestedFor = this.dataset();
    }
    this.step.set('mapping');
  }

  protected goValidation(): void {
    if (this.mappingError()) {
      return;
    }
    const existing = environment.useMockAuth ? existingRowsForImport(this.dataset()) : [];
    const validated = validateImportTable(this.table(), this.fieldMapping(), this.schema(), existing);
    this.validated.set(validated);
    this.step.set('validation');
  }

  protected async commit(): Promise<void> {
    const validated = this.validated();
    if (!validated || this.committing() || validated.valid.length === 0 || validated.missingMessage) {
      return;
    }
    this.committing.set(true);
    this.commitError.set(null);
    try {
      const committed = await this.api.commit(this.dataset(), validated.valid);
      const errors = validated.issues.filter((issue) => issue.kind === 'error').length;
      this.result.set({
        processed: this.table().rows.length,
        imported: committed.imported,
        rejected: errors,
        skippedDuplicates: validated.duplicates + committed.skippedDuplicates,
      });
      this.step.set('result');
    } catch {
      this.commitError.set('No se pudo completar la importación.');
    } finally {
      this.committing.set(false);
    }
  }

  protected downloadErrors(): void {
    const validated = this.validated();
    if (!validated) {
      return;
    }
    const csv = `\uFEFFFila;Tipo;Detalle\n${validated.issues
      .map((issue) => {
        const type =
          issue.kind === 'existing'
            ? 'Ya existía'
            : issue.kind === 'file'
              ? 'Duplicado en archivo'
              : 'Error';
        return `${issue.row};${type};${issue.message}`;
      })
      .join('\n')}`;
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'errores-importacion.csv');
  }

  protected reset(): void {
    this.step.set('file');
    this.file.set(null);
    this.fileError.set(null);
    this.table.set(emptyTable());
    this.mapping.set(emptyColumnMapping([]));
    this.validated.set(null);
    this.result.set(null);
    this.commitError.set(null);
    this.suggestedFor = null;
  }

  protected async onSheet(name: string): Promise<void> {
    const file = this.file();
    if (!file || name === this.table().sheet) {
      return;
    }
    try {
      const table = await parseImportFile(file, name);
      this.table.set(table);
      this.suggestedFor = null;
    } catch (error) {
      this.fileError.set(error instanceof Error ? error.message : 'No se pudo leer la hoja.');
    }
  }

  private async useFile(file: File): Promise<void> {
    const error = validateImportFile(file);
    this.fileError.set(error);
    if (error) {
      this.file.set(null);
      this.table.set(emptyTable());
      this.step.set('file');
      return;
    }
    try {
      const table = await parseImportFile(file);
      this.file.set(file);
      this.table.set(table);
      this.mapping.set(emptyColumnMapping(table.headers));
      this.suggestedFor = null;
      this.validated.set(null);
      this.step.set('preview');
    } catch (caught) {
      this.file.set(null);
      this.table.set(emptyTable());
      this.step.set('file');
      this.fileError.set(
        caught instanceof Error ? caught.message : 'No se pudo leer el archivo. Comprueba que sea un CSV o Excel válido.',
      );
    }
  }

  protected fileSize(file: File): string {
    if (file.size < 1024) {
      return `${file.size} B`;
    }
    return `${(file.size / 1024).toFixed(1)} KB`;
  }

  protected resultCopy(current: {
    processed: number;
    imported: number;
    rejected: number;
    skippedDuplicates: number;
  }): string {
    const parts = [
      `${current.processed} filas procesadas`,
      `${current.imported} importadas`,
    ];
    if (current.skippedDuplicates > 0) {
      parts.push(`${current.skippedDuplicates} duplicadas omitidas`);
    }
    if (current.rejected > 0) {
      parts.push(`${current.rejected} con errores`);
    }
    return `${parts.join('. ')}.`;
  }
}
