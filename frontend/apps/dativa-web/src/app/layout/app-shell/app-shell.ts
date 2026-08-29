import { DatePipe } from '@angular/common';
import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Menu, MenuItem, MenuTrigger } from '@angular/aria/menu';
import { filter, map } from 'rxjs';
import { DEMO_ROLE_LABELS } from '../../core/auth/demo-accounts';
import { AuthStore } from '../../core/auth/auth.store';
import { RealtimeClient } from '../../core/realtime/realtime.client';
import { AlertEvaluator } from '../../features/alerts/alert.evaluator';
import { NotificationsApi } from '../../features/notifications/notifications.api';
import { ThemeToggle } from '../../core/theme/theme-toggle';
import { NOTIFICATION_TYPE_LABELS } from '../../features/notifications/notification.store';
import { RealtimeStatusIndicator } from '../../core/realtime/realtime-status';

@Component({
  selector: 'dtv-app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Menu, MenuItem, MenuTrigger, DatePipe, ThemeToggle, RealtimeStatusIndicator],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthStore);
  protected readonly roleLabels = DEMO_ROLE_LABELS;
  private readonly realtime = inject(RealtimeClient);
  private readonly alerts = inject(AlertEvaluator);
  protected readonly notifications = inject(NotificationsApi);
  protected readonly navOpen = signal(false);
  protected readonly navCollapsed = signal(readNavCollapsed());
  protected readonly notesOpen = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly canvasLayout = computed(() => isCanvasRoute(this.url()));
  protected readonly typeLabels = NOTIFICATION_TYPE_LABELS;
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Buenos días';
    }
    if (hour < 19) {
      return 'Buenas tardes';
    }
    return 'Buenas noches';
  });
  protected readonly firstName = computed(() => this.auth.user()?.name.split(/\s+/)[0] ?? '');

  constructor() {
    this.alerts.start();
    void this.notifications.load();
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }

  protected toggleNav(): void {
    this.navOpen.update((open) => !open);
  }

  protected toggleCollapsed(): void {
    const next = !this.navCollapsed();
    this.navCollapsed.set(next);
    writeNavCollapsed(next);
  }

  protected toggleNotes(): void {
    this.notesOpen.update((open) => !open);
    if (!this.notesOpen()) {
      return;
    }
    void this.notifications.load();
  }

  protected markRead(id: string): void {
    void this.notifications.markRead(id);
  }

  protected markAllRead(): void {
    void this.notifications.markAllRead();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.notesOpen()) {
      this.notesOpen.set(false);
      return;
    }
    if (this.navOpen()) {
      this.closeNav();
    }
  }

  protected logout(): void {
    this.alerts.stop();
    this.realtime.stop();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

const NAV_COLLAPSED_KEY = 'dativa.nav.collapsed';

function readNavCollapsed(): boolean {
  try {
    return localStorage.getItem(NAV_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeNavCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore quota / private mode */
  }
}

function isCanvasRoute(url: string): boolean {
  const path = url.split(/[?#]/)[0];
  return /\/dashboards\/[^/]+(\/edit)?$/.test(path) || path === '/explorer';
}
