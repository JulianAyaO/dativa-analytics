import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Button, Card, Input } from '@dativa/ui';
import { AuthStore, readAuthError } from '../../../../core/auth/auth.store';
import { DEMO_ACCOUNTS, DEMO_ROLE_LABELS, DemoAccount } from '../../../../core/auth/auth.api';
import { UserRole } from '../../../../shared/models/user.model';
import { AuthHero } from '../../components/auth-hero/auth-hero';
import { ThemeToggle } from '../../../../core/theme/theme-toggle';

@Component({
  selector: 'dtv-login-page',
  imports: [FormField, Input, Button, Card, RouterLink, AuthHero, ThemeToggle],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly loginError = signal<string | null>(null);
  protected readonly demoEmail = signal<string | null>(null);
  protected readonly demos = DEMO_ACCOUNTS;
  protected readonly roleLabels = DEMO_ROLE_LABELS;
  protected readonly roleHints: Record<UserRole, string> = {
    ADMIN: 'Usuarios, actividad y configuración',
    ANALYST: 'Dashboards, importación y alertas',
    VIEWER: 'Consulta tableros y explorador',
  };
  protected readonly model = signal({
    email: '',
    password: '',
  });

  protected readonly loginForm = form(this.model, (login) => {
    required(login.email, { message: 'El correo es obligatorio' });
    email(login.email, { message: 'Introduce un correo válido' });
    required(login.password, { message: 'La contraseña es obligatoria' });
  });

  protected readonly busy = computed(
    () => this.loginForm().submitting() || this.demoEmail() !== null,
  );

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) {
      return;
    }

    this.loginError.set(null);

    await submit(this.loginForm, async () => {
      try {
        await this.auth.login(this.model());
        await this.router.navigateByUrl('/dashboards');
      } catch (error) {
        this.loginError.set(readAuthError(error, 'Correo o contraseña incorrectos.'));
      }
    });
  }

  protected async loginAs(account: DemoAccount): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.loginError.set(null);
    this.demoEmail.set(account.email);
    this.model.set({ email: account.email, password: account.password });

    try {
      await this.auth.login({ email: account.email, password: account.password });
      await this.router.navigateByUrl('/dashboards');
    } catch (error) {
      this.loginError.set(readAuthError(error, 'No se pudo iniciar la sesión de demostración.'));
    } finally {
      this.demoEmail.set(null);
    }
  }

  protected initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
