import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { WorkIdentity } from '@casehubio/blocks-ui-core';
import { FocusTrapMixin, KeyboardShortcutMixin } from '@casehubio/pages-primitives/a11y';
import { PushMixin } from '@casehubio/pages-component';
import { NotificationApi } from './api.js';

/**
 * Notification bell component with unread badge and dropdown inbox.
 *
 * Connects to platform SSE endpoint for real-time badge updates.
 */
@customElement('blocks-notification-bell')
export class NotificationBell extends PushMixin(KeyboardShortcutMixin(FocusTrapMixin(LitElement))) {
  @property({ type: String }) endpoint?: string;
  @property({ type: Object }) identity?: WorkIdentity;
  @property({ type: Boolean, reflect: true }) open = false;

  /** Injectable fetch for testing */
  fetchFn: typeof fetch = fetch;

  @state() private unreadCount = 0;

  private api?: NotificationApi;
  private buttonRef?: HTMLButtonElement | undefined;

  static override styles = css`
    :host {
      display: inline-block;
      position: relative;
    }

    button {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--pages-neutral-12);
      transition: background 0.2s;
    }

    button:hover {
      background: var(--pages-neutral-3);
    }

    button:focus-visible {
      outline: 2px solid var(--pages-primary-9);
      outline-offset: 2px;
    }

    .bell-icon {
      width: 20px;
      height: 20px;
      position: relative;
    }

    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--pages-danger-9);
      color: white;
      border-radius: 10px;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: 600;
      min-width: 18px;
      text-align: center;
      line-height: 1.2;
    }

    .dropdown {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      background: var(--pages-neutral-1);
      border: 1px solid var(--pages-neutral-6);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      min-width: 360px;
      max-height: 480px;
      overflow: hidden;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('keydown', this.handleKeydown);

    if (this.endpoint != null) {
      this.api = new NotificationApi(this.endpoint, this.fetchFn);
      this.loadUnreadCount();
      this._setupPush();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.handleKeydown);
  }

  override updated(changed: PropertyValues<this>): void {
    super.updated(changed);

    if (changed.has('endpoint')) {
      if (this.endpoint != null) {
        this.api = new NotificationApi(this.endpoint, this.fetchFn);
        this.loadUnreadCount();
        if (!this.pushTopics.length) this.pushTopics = ['notifications:unread-count'];
      }
    }

    if (changed.has('open') && this.open) {
      const dropdown = this.shadowRoot?.querySelector('.dropdown') as HTMLElement;
      if (dropdown) {
        this.trapFocus(dropdown);
      }
    } else if (changed.has('open') && !this.open) {
      this.releaseFocus();
    }
  }

  protected override onPushEvent(event: unknown): void {
    const data = event as { count?: number };
    if (typeof data.count === 'number') {
      this.unreadCount = data.count;
    }
  }

  private async loadUnreadCount(): Promise<void> {
    if (this.api == null) return;

    try {
      const count = await this.api.unreadCount();
      if (typeof count === 'number' && !Number.isNaN(count)) {
        this.unreadCount = count;
      }
    } catch (e) {
      console.error('Failed to load unread count:', e);
    }
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.open) {
      e.preventDefault();
      this.open = false;
      // Restore focus to bell button after closing
      this.buttonRef?.focus();
    }
  };

  private toggleDropdown(): void {
    this.open = !this.open;
  }

  private get badgeText(): string {
    return this.unreadCount > 99 ? '99+' : String(this.unreadCount);
  }

  private get buttonAriaLabel(): string {
    if (this.unreadCount === 0) {
      return 'Notifications';
    }
    return `Notifications (${this.unreadCount} unread)`;
  }

  override firstUpdated(): void {
    this.buttonRef = this.shadowRoot?.querySelector('button') ?? undefined;
  }

  override render() {
    return html`
      <button
        @click=${this.toggleDropdown}
        aria-label=${this.buttonAriaLabel}
        aria-expanded=${this.open}
        aria-haspopup="true"
      >
        <span class="bell-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M15 6.5C15 5.17392 14.4732 3.90215 13.5355 2.96447C12.5979 2.02678 11.3261 1.5 10 1.5C8.67392 1.5 7.40215 2.02678 6.46447 2.96447C5.52678 3.90215 5 5.17392 5 6.5C5 12.5 2.5 14 2.5 14H17.5C17.5 14 15 12.5 15 6.5Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M11.4417 17.5C11.2952 17.7526 11.0849 17.9622 10.8319 18.1079C10.5789 18.2537 10.292 18.3304 10 18.3304C9.70802 18.3304 9.42111 18.2537 9.16814 18.1079C8.91516 17.9622 8.70485 17.7526 8.55835 17.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          ${this.unreadCount > 0
            ? html`<span class="badge" aria-hidden="true">${this.badgeText}</span>`
            : ''}
        </span>
      </button>

      ${this.open
        ? html`
            <div class="dropdown" role="dialog" aria-label="Notification inbox">
              <blocks-notification-inbox
                .endpoint=${this.endpoint}
                .identity=${this.identity}
                .fetchFn=${this.fetchFn}
              ></blocks-notification-inbox>
            </div>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-notification-bell': NotificationBell;
  }
}
