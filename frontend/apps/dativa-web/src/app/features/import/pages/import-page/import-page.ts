import { Component } from '@angular/core';
import { PageHeader } from '../../../../layout/page-header/page-header';
import { ImportWizard } from '../../components/import-wizard/import-wizard';

@Component({
  selector: 'dtv-import-page',
  imports: [PageHeader, ImportWizard],
  template: `
    <dtv-page-header
      title="Importar datos"
      subtitle="Añade filas a Ventas o Pedidos desde un CSV o Excel."
    />
    <dtv-import-wizard />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--dtv-space-5);
      width: 100%;
      min-height: 100%;
    }
  `,
})
export class ImportPage {}
