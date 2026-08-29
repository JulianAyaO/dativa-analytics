import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RealtimeClient } from './realtime.client';
import { RealtimeStatus } from './sale-created';

@Component({
  selector: 'dtv-realtime-status',
  template: `
    <p class="dtv-realtime" [attr.data-status]="status()" [attr.aria-label]="label()" role="status">
      <span class="dtv-realtime__dot" aria-hidden="true"></span>
      <span class="dtv-realtime__label">{{ label() }}</span>
    </p>
  `,
  styles: `
    .dtv-realtime {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0;
    }

    .dtv-realtime__dot {
      width: 0.48rem;
      height: 0.48rem;
      border-radius: 999px;
      background: var(--dtv-color-text-muted);
    }

    .dtv-realtime__label {
      color: var(--dtv-color-text);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .dtv-realtime[data-status='connected'] .dtv-realtime__dot {
      background: var(--dtv-color-success);
      box-shadow: 0 0 0 0 rgb(6 118 71 / 45%);
      animation: dtv-live-dot 1.8s ease-out infinite;
    }

    .dtv-realtime[data-status='connected'] .dtv-realtime__label {
      color: var(--dtv-color-success);
    }

    @keyframes dtv-live-dot {
      70% {
        box-shadow: 0 0 0 0.45rem rgb(6 118 71 / 0%);
      }

      100% {
        box-shadow: 0 0 0 0 rgb(6 118 71 / 0%);
      }
    }

    .dtv-realtime[data-status='reconnecting'] .dtv-realtime__dot {
      background: var(--dtv-color-warning);
    }

    .dtv-realtime[data-status='disconnected'] .dtv-realtime__dot {
      background: var(--dtv-color-danger);
    }

    :host-context(.dtv-shell--nav-collapsed) .dtv-realtime__label {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RealtimeStatusIndicator {
  private readonly realtime = inject(RealtimeClient);

  protected readonly status = this.realtime.status;

  protected readonly label = computed(() => labelFor(this.status()));
}

function labelFor(status: RealtimeStatus): string {
  switch (status) {
    case 'connected':
      return 'En vivo';
    case 'reconnecting':
      return 'Reconectando';
    default:
      return 'Sin conexión';
  }
}
