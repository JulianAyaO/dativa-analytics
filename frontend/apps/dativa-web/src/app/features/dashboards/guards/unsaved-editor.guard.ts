import { CanDeactivateFn } from '@angular/router';
import { DashboardEditorPage } from '../pages/dashboard-editor-page/dashboard-editor-page';

export const unsavedEditorGuard: CanDeactivateFn<DashboardEditorPage> = (component) =>
  component.confirmLeave();
