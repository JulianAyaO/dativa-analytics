import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Button, Card, Input } from '@dativa/ui';
import { ThemeMode, ThemeStore } from '../../../../core/theme/theme.store';
import { AuthStore, readAuthError } from '../../../../core/auth/auth.store';
import { AccountApi } from '../../../../core/auth/users.api';
import { DEMO_ROLE_LABELS } from '../../../../core/auth/demo-accounts';
import { isStrongPassword, PASSWORD_HINT } from '../../../../core/auth/password';
import { RealtimeClient } from '../../../../core/realtime/realtime.client';
import { PageHeader } from '../../../../layout/page-header/page-header';

@Component({
  selector: 'dtv-settings-page',
  imports: [PageHeader, Card, Button, Input, FormField],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  private readonly router = inject(Router);
  private readonly account = inject(AccountApi);
  private readonly realtime = inject(RealtimeClient);
  protected readonly auth = inject(AuthStore);
  protected readonly theme = inject(ThemeStore);
  protected readonly roleLabels = DEMO_ROLE_LABELS;
  protected readonly passwordHint = PASSWORD_HINT;

  protected readonly profileMessage = signal<string | null>(null);
  protected readonly profileError = signal<string | null>(null);
  protected readonly passwordMessage = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly profileDraft = signal({
    name: this.auth.user()?.name ?? '',
    email: this.auth.user()?.email ?? '',
    emailConfirm: this.auth.user()?.email ?? '',
  });
  protected readonly profileForm = form(this.profileDraft, (fields) => {
    required(fields.name, { message: 'El nombre es obligatorio' });
    required(fields.email, { message: 'El correo es obligatorio' });
    email(fields.email, { message: 'Introduce un correo válido' });
    required(fields.emailConfirm, { message: 'Confirma el correo' });
    email(fields.emailConfirm, { message: 'Introduce un correo válido' });
  });

  protected readonly passwordDraft = signal({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  protected readonly passwordForm = form(this.passwordDraft, (fields) => {
    required(fields.currentPassword, { message: 'La contraseña actual es obligatoria' });
    required(fields.newPassword, { message: 'La nueva contraseña es obligatoria' });
    required(fields.newPasswordConfirm, { message: 'Confirma la nueva contraseña' });
  });

  protected readonly themeOptions = [
    { id: 'light' as const, label: 'Claro', hint: 'Fondos claros y alto contraste diurno' },
    { id: 'dark' as const, label: 'Oscuro', hint: 'Reduce el brillo en entornos oscuros' },
    { id: 'system' as const, label: 'Sistema', hint: 'Sigue la preferencia del dispositivo' },
  ];

  protected setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  protected async saveProfile(event: Event): Promise<void> {
    event.preventDefault();
    const user = this.auth.user();
    if (!user) {
      return;
    }

    this.profileMessage.set(null);
    this.profileError.set(null);

    await submit(this.profileForm, async () => {
      try {
        const session = await this.account.updateProfile(user.id, this.profileDraft());
        this.auth.applySession(session);
        this.profileMessage.set('Perfil actualizado.');
      } catch (error) {
        this.profileError.set(readAuthError(error, 'No se pudo actualizar el perfil.'));
        throw error;
      }
    });
  }

  protected async savePassword(event: Event): Promise<void> {
    event.preventDefault();
    const user = this.auth.user();
    if (!user) {
      return;
    }

    this.passwordMessage.set(null);
    this.passwordError.set(null);

    await submit(this.passwordForm, async () => {
      const value = this.passwordDraft();
      if (!isStrongPassword(value.newPassword)) {
        this.passwordError.set(PASSWORD_HINT);
        throw new Error('WEAK_PASSWORD');
      }
      try {
        await this.account.changePassword(user.id, value);
        this.passwordDraft.set({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
        this.passwordMessage.set('Contraseña actualizada.');
      } catch (error) {
        this.passwordError.set(readAuthError(error, 'No se pudo cambiar la contraseña.'));
        throw error;
      }
    });
  }

  protected logout(): void {
    this.realtime.stop();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
