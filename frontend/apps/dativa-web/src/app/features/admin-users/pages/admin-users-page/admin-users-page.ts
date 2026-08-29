import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Badge, Button, Card, EmptyState, Input, Loading, Select } from '@dativa/ui';
import { DEMO_ROLE_LABELS } from '../../../../core/auth/demo-accounts';
import { AuthStore, readAuthError } from '../../../../core/auth/auth.store';
import { CreateUserDraft, UpdateUserDraft, UsersApi } from '../../../../core/auth/users.api';
import { isStrongPassword, PASSWORD_HINT } from '../../../../core/auth/password';
import { ManagedUser, UserRole } from '../../../../shared/models/user.model';
import { PageHeader } from '../../../../layout/page-header/page-header';

type FormMode = 'closed' | 'create' | 'edit';

@Component({
  selector: 'dtv-admin-users-page',
  imports: [PageHeader, Card, Button, Badge, Input, Select, EmptyState, Loading, FormField, DatePipe],
  templateUrl: './admin-users-page.html',
  styleUrl: './admin-users-page.scss',
})
export class AdminUsersPage {
  private readonly api = inject(UsersApi);
  private readonly auth = inject(AuthStore);

  protected readonly roleLabels = DEMO_ROLE_LABELS;
  protected readonly passwordHint = PASSWORD_HINT;
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly users = signal<ManagedUser[]>([]);
  protected readonly search = signal('');
  protected readonly roleFilter = signal<UserRole | ''>('');
  protected readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  protected readonly formMode = signal<FormMode>('closed');
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly createDraft = signal({
    name: '',
    email: '',
    password: '',
    role: 'VIEWER' as UserRole,
  });
  protected readonly createForm = form(this.createDraft, (fields) => {
    required(fields.name, { message: 'El nombre es obligatorio' });
    required(fields.email, { message: 'El correo es obligatorio' });
    email(fields.email, { message: 'Introduce un correo válido' });
    required(fields.password, { message: 'La contraseña es obligatoria' });
  });

  protected readonly editDraft = signal({
    name: '',
    email: '',
    role: 'VIEWER' as UserRole,
    active: 'true',
  });
  protected readonly editForm = form(this.editDraft, (fields) => {
    required(fields.name, { message: 'El nombre es obligatorio' });
    required(fields.email, { message: 'El correo es obligatorio' });
    email(fields.email, { message: 'Introduce un correo válido' });
  });

  constructor() {
    void this.refresh();
  }

  protected async refresh(): Promise<void> {
    this.status.set('loading');
    try {
      this.users.set(
        await this.api.list({
          search: this.search(),
          role: this.roleFilter(),
          status: this.statusFilter(),
        }),
      );
      this.status.set('ready');
    } catch {
      this.users.set([]);
      this.status.set('error');
    }
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    void this.refresh();
  }

  protected onRoleFilter(value: string): void {
    this.roleFilter.set(value === 'ADMIN' || value === 'ANALYST' || value === 'VIEWER' ? value : '');
    void this.refresh();
  }

  protected onStatusFilter(value: string): void {
    this.statusFilter.set(value === 'active' || value === 'inactive' ? value : 'all');
    void this.refresh();
  }

  protected openCreate(): void {
    this.formMode.set('create');
    this.editingId.set(null);
    this.formError.set(null);
    this.success.set(null);
    this.createDraft.set({ name: '', email: '', password: '', role: 'VIEWER' });
  }

  protected openEdit(user: ManagedUser): void {
    if (this.isSelf(user)) {
      return;
    }
    if (this.isEditing(user)) {
      this.cancelForm();
      return;
    }
    this.formMode.set('edit');
    this.editingId.set(user.id);
    this.formError.set(null);
    this.success.set(null);
    this.editDraft.set({
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active ? 'true' : 'false',
    });
  }

  protected cancelForm(): void {
    this.formMode.set('closed');
    this.editingId.set(null);
    this.formError.set(null);
  }

  protected async onCreate(event: Event): Promise<void> {
    event.preventDefault();
    this.formError.set(null);

    await submit(this.createForm, async () => {
      const draft = this.createDraft();
      if (!isStrongPassword(draft.password)) {
        this.formError.set(PASSWORD_HINT);
        throw new Error('WEAK_PASSWORD');
      }
      try {
        await this.api.create(draft as CreateUserDraft);
        this.success.set(`Se creó ${draft.name}.`);
        this.cancelForm();
        await this.refresh();
      } catch (error) {
        this.formError.set(readAuthError(error, 'No se pudo crear el usuario.'));
        throw error;
      }
    });
  }

  protected async onEdit(event: Event): Promise<void> {
    event.preventDefault();
    const id = this.editingId();
    if (!id || id === this.auth.user()?.id) {
      return;
    }

    this.formError.set(null);
    await submit(this.editForm, async () => {
      const draft = this.editDraft();
      const payload: UpdateUserDraft = {
        name: draft.name,
        email: draft.email,
        role: draft.role,
        active: draft.active === 'true',
      };
      const current = this.users().find((item) => item.id === id);
      if (current?.active && !payload.active) {
        if (!globalThis.confirm(`¿Desactivar a ${current.name}? No podrá iniciar sesión.`)) {
          return;
        }
      }
      try {
        await this.api.update(id, payload);
        this.success.set('Usuario actualizado.');
        this.cancelForm();
        await this.refresh();
      } catch (error) {
        this.formError.set(readAuthError(error, 'No se pudo actualizar el usuario.'));
        throw error;
      }
    });
  }

  protected async toggleActive(user: ManagedUser): Promise<void> {
    if (this.isSelf(user)) {
      this.formError.set('No puedes cambiar el estado de tu propia cuenta.');
      return;
    }
    const next = !user.active;
    const label = next ? 'activar' : 'desactivar';
    if (!globalThis.confirm(`¿${label.charAt(0).toUpperCase() + label.slice(1)} a ${user.name}?`)) {
      return;
    }
    try {
      await this.api.update(user.id, {
        name: user.name,
        email: user.email,
        role: user.role,
        active: next,
      });
      this.success.set(next ? `${user.name} está activo.` : `${user.name} está desactivado.`);
      await this.refresh();
    } catch (error) {
      this.formError.set(readAuthError(error, 'No se pudo cambiar el estado.'));
    }
  }

  protected isSelf(user: ManagedUser): boolean {
    return user.id === this.auth.user()?.id;
  }

  protected isEditing(user: ManagedUser): boolean {
    return this.formMode() === 'edit' && this.editingId() === user.id;
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  protected lastAccess(user: ManagedUser): string {
    return user.lastLoginAt ?? 'Sin accesos';
  }
}
