import { SessionUser, UserRole } from '../../shared/models/user.model';

export interface DemoAccount {
  email: string;
  password: string;
  user: SessionUser;
}

export const DEMO_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  ANALYST: 'Analista',
  VIEWER: 'Visualizador',
};

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    email: 'admin@dativa.app',
    password: 'Dativa123!',
    user: {
      id: 'usr_admin',
      email: 'admin@dativa.app',
      name: 'Ana Admin',
      role: 'ADMIN',
    },
  },
  {
    email: 'analyst@dativa.app',
    password: 'Dativa123!',
    user: {
      id: 'usr_analyst',
      email: 'analyst@dativa.app',
      name: 'Luis Analista',
      role: 'ANALYST',
    },
  },
  {
    email: 'viewer@dativa.app',
    password: 'Dativa123!',
    user: {
      id: 'usr_viewer',
      email: 'viewer@dativa.app',
      name: 'Marta Visualizadora',
      role: 'VIEWER',
    },
  },
];
