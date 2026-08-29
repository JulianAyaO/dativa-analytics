import { Component, input } from '@angular/core';

@Component({
  selector: 'dtv-page-header',
  template: `
    <header class="dtv-page-header">
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <div class="dtv-page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .dtv-page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--dtv-space-4);
    }

    h1,
    p {
      margin: 0;
    }

    h1 {
      font-size: clamp(1.4rem, 1.8vw, 1.75rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.2;
    }

    p {
      margin-top: var(--dtv-space-1);
      color: var(--dtv-color-text-muted);
    }

    .dtv-page-header__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: var(--dtv-space-3);
    }

    @media (max-width: 720px) {
      .dtv-page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .dtv-page-header__actions {
        justify-content: flex-start;
      }
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
