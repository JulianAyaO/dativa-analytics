import { Routes } from '@angular/router';
import { adminGuard, authGuard, editorGuard, guestGuard } from './core/auth/auth.guards';
import { unsavedEditorGuard } from './features/dashboards/guards/unsaved-editor.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page').then((m) => m.LoginPage),
    canActivate: [guestGuard],
    title: 'Iniciar sesión · Dativa',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register-page/register-page').then((m) => m.RegisterPage),
    canActivate: [guestGuard],
    title: 'Crear cuenta · Dativa',
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-shell/app-shell').then((m) => m.AppShell),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboards' },
      {
        path: 'dashboards',
        loadComponent: () =>
          import('./features/dashboards/pages/dashboard-list-page/dashboard-list-page').then(
            (m) => m.DashboardListPage,
          ),
        title: 'Dashboards · Dativa',
      },
      {
        path: 'dashboards/:id/edit',
        loadComponent: () =>
          import('./features/dashboards/pages/dashboard-editor-page/dashboard-editor-page').then(
            (m) => m.DashboardEditorPage,
          ),
        canActivate: [editorGuard],
        canDeactivate: [unsavedEditorGuard],
        title: 'Editor · Dativa',
      },
      {
        path: 'dashboards/:id',
        loadComponent: () =>
          import('./features/dashboards/pages/dashboard-view-page/dashboard-view-page').then(
            (m) => m.DashboardViewPage,
          ),
        title: 'Dashboard · Dativa',
      },
      {
        path: 'explorer',
        loadComponent: () =>
          import('./features/explorer/pages/explorer-page/explorer-page').then(
            (m) => m.ExplorerPage,
          ),
        title: 'Explorador · Dativa',
      },
      {
        path: 'import',
        loadComponent: () =>
          import('./features/import/pages/import-page/import-page').then((m) => m.ImportPage),
        canActivate: [editorGuard],
        title: 'Importar · Dativa',
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./features/alerts/pages/alerts-page/alerts-page').then((m) => m.AlertsPage),
        title: 'Alertas · Dativa',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/pages/settings-page/settings-page').then(
            (m) => m.SettingsPage,
          ),
        title: 'Ajustes · Dativa',
      },
      {
        path: 'admin/users',
        loadComponent: () =>
          import('./features/admin-users/pages/admin-users-page/admin-users-page').then(
            (m) => m.AdminUsersPage,
          ),
        canActivate: [adminGuard],
        title: 'Usuarios · Dativa',
      },
      {
        path: 'admin/activity',
        loadComponent: () =>
          import('./features/admin-users/pages/admin-activity-page/admin-activity-page').then(
            (m) => m.AdminActivityPage,
          ),
        canActivate: [adminGuard],
        title: 'Actividad · Dativa',
      },
    ],
  },
  { path: '**', redirectTo: 'dashboards' },
];
