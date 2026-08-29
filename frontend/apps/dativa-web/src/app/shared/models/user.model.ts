export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  user: SessionUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export function canEditDashboards(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'ANALYST';
}

export function canManageAlerts(role: UserRole): boolean {
  return canEditDashboards(role);
}

export function canImportData(role: UserRole): boolean {
  return canEditDashboards(role);
}
