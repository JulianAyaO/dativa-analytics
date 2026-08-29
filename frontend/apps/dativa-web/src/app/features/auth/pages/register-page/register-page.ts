import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, email, form, minLength, required, submit } from '@angular/forms/signals';
import { Button, Card, Input } from '@dativa/ui';
import { AuthStore, readAuthError } from '../../../../core/auth/auth.store';
import { isStrongPassword, PASSWORD_HINT } from '../../../../core/auth/password';
import { AuthHero } from '../../components/auth-hero/auth-hero';
import { ThemeToggle } from '../../../../core/theme/theme-toggle';

@Component({
  selector: 'dtv-register-page',
  imports: [FormField, Input, Button, Card, RouterLink, AuthHero, ThemeToggle],
  templateUrl: './register-page.html',
  styleUrl: '../login-page/login-page.scss',
})
export class RegisterPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly registerError = signal<string | null>(null);
  protected readonly passwordHint = PASSWORD_HINT;
  protected readonly model = signal({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });

  protected readonly registerForm = form(this.model, (fields) => {
    required(fields.name, { message: 'El nombre es obligatorio' });
    minLength(fields.name, 2, { message: 'El nombre es demasiado corto' });
    required(fields.email, { message: 'El correo es obligatorio' });
    email(fields.email, { message: 'Introduce un correo válido' });
    required(fields.password, { message: 'La contraseña es obligatoria' });
    required(fields.passwordConfirm, { message: 'Confirma la contraseña' });
  });

  protected readonly busy = computed(() => this.registerForm().submitting());

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) {
      return;
    }

    this.registerError.set(null);

    await submit(this.registerForm, async () => {
      const value = this.model();
      if (!isStrongPassword(value.password)) {
        this.registerError.set(PASSWORD_HINT);
        throw new Error('WEAK_PASSWORD');
      }
      if (value.password !== value.passwordConfirm) {
        this.registerError.set('Las contraseñas no coinciden.');
        throw new Error('PASSWORD_MISMATCH');
      }

      try {
        await this.auth.register(value);
        await this.router.navigateByUrl('/dashboards');
      } catch (error) {
        this.registerError.set(readAuthError(error, 'No se pudo crear la cuenta.'));
        throw error;
      }
    });
  }
}
