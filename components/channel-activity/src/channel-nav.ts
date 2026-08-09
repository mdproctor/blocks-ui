import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { QhorusChannel, ChannelSemantic } from './types.js';
import { emitPagesEvent, BlocksConfirmDialog } from '@casehubio/blocks-ui-core';
import { ChannelEventTopics } from './events.js';
import '@casehubio/pages-ui-components';

@customElement('blocks-channel-nav')
export class ChannelNavElement extends LitElement {
  @property({ type: Array }) channels: QhorusChannel[] = [];
  @property({ type: String }) selectedChannelId?: string;
  @property({ type: String }) layout: 'sidebar' | 'dropdown' = 'sidebar';
  @property({ type: Boolean }) showCreate = true;
  @property({ type: Boolean }) showDelete = true;
  @property({ type: Object }) messageCounts: Record<string, number> = {};
  @state() private _focusedIndex = 0;
  @state() private _dropdownOpen = false;
  @state() private _deleteTarget: QhorusChannel | null = null;
  @state() private _showCreateDialog = false;

  static override readonly styles = css`
    :host {
      display: block;
      padding: var(--pages-space-3, 12px);
      background: var(--pages-neutral-1, #ffffff);
      color: var(--pages-neutral-12, #1a1a1a);
      height: 100%;
      box-sizing: border-box;
      overflow-y: auto;
    }
    .channel-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-1, 4px);
    }
    .channel-item {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-2, 8px);
      border-radius: var(--pages-radius-1, 4px);
      cursor: pointer;
      transition: background 0.2s;
      position: relative;
    }
    .channel-item:hover { background: var(--pages-neutral-3, #f5f5f5); }
    .channel-item.selected { background: var(--pages-accent-3, #e0f2fe); }
    .channel-item.focused {
      outline: 2px solid var(--pages-accent-7, #818cf8);
      outline-offset: -2px;
    }
    .channel-icon {
      flex-shrink: 0;
      font-size: 14px;
      color: var(--pages-neutral-9, #999);
      margin-right: 2px;
    }
    .channel-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .delete-btn {
      flex-shrink: 0;
      background: transparent;
      border: none;
      color: var(--pages-neutral-8, #6b7280);
      cursor: pointer;
      padding: var(--pages-space-1, 4px);
      border-radius: var(--pages-radius-1, 4px);
      font-size: 14px;
      line-height: 1;
      opacity: 0;
      transition: opacity 0.2s, background 0.2s;
    }
    .channel-item:hover .delete-btn { opacity: 1; }
    .delete-btn:hover {
      background: var(--pages-neutral-4, #e5e5e5);
      color: var(--pages-danger-1, #dc2626);
    }
    .create-channel-btn {
      margin-top: var(--pages-space-3, 12px);
      width: 100%;
      padding: var(--pages-space-2, 8px);
      background: var(--pages-accent-9, #0ea5e9);
      color: var(--pages-neutral-1, #fff);
      border: none;
      border-radius: var(--pages-radius-1, 4px);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }
    .create-channel-btn:hover { background: var(--pages-accent-10, #0284c7); }
    .message-count {
      flex-shrink: 0;
      font-size: var(--pages-font-size-xs, 11px);
      background: var(--pages-neutral-4, #d4d4d4);
      color: var(--pages-neutral-11, #333);
      padding: 0 6px;
      border-radius: 9999px;
      min-width: 18px;
      text-align: center;
      line-height: 18px;
    }
    .dropdown-wrapper { position: relative; }
    .dropdown-trigger {
      width: 100%;
      padding: var(--pages-space-2, 8px);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-1, 4px);
      background: var(--pages-neutral-1, #ffffff);
      color: var(--pages-neutral-12, #1a1a1a);
      font-size: 14px;
      cursor: pointer;
      text-align: left;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
    }
    .dropdown-trigger:hover { border-color: var(--pages-neutral-7, #a3a3a3); }
    .dropdown-arrow { font-size: 10px; color: var(--pages-neutral-8, #888); }
    .dropdown-panel {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 2px;
      background: var(--pages-neutral-1, #ffffff);
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-1, 4px);
      box-shadow: var(--pages-shadow-3, 0 4px 12px rgba(0,0,0,0.1));
      z-index: 10;
      max-height: 200px;
      overflow-y: auto;
      list-style: none;
      margin-left: 0;
      padding: var(--pages-space-1, 4px);
    }
    .dropdown-option {
      padding: var(--pages-space-2, 8px);
      cursor: pointer;
      border-radius: var(--pages-radius-1, 4px);
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .dropdown-option:hover { background: var(--pages-neutral-3, #f5f5f5); }
    .dropdown-option.selected { background: var(--pages-accent-3, #e0f2fe); }
    .dropdown-option.focused { outline: 2px solid var(--pages-accent-7, #818cf8); outline-offset: -2px; }
    .dropdown-count {
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-neutral-8, #888);
    }
  `;

  private getChannelIcon(_semantic: ChannelSemantic): string {
    return '#';
  }

  private handleChannelClick(channelId: string): void {
    emitPagesEvent(this, ChannelEventTopics.SELECT_CHANNEL, { channelId });
  }

  private handleDeleteClick(event: MouseEvent, channel: QhorusChannel): void {
    event.stopPropagation();
    this._deleteTarget = channel;
  }

  private _onDeleteConfirm(): void {
    if (this._deleteTarget) {
      emitPagesEvent(this, ChannelEventTopics.DELETE_CHANNEL, { channelId: this._deleteTarget.id });
    }
    this._deleteTarget = null;
  }

  private _onDeleteCancel(): void {
    this._deleteTarget = null;
  }

  private handleCreateChannel(): void {
    this._showCreateDialog = true;
  }

  private _onCreateConfirm(e: CustomEvent<{ reason?: string }>): void {
    const name = e.detail?.reason?.trim();
    if (name) {
      emitPagesEvent(this, ChannelEventTopics.CREATE_CHANNEL, { name });
    }
    this._showCreateDialog = false;
  }

  private _onCreateCancel(): void {
    this._showCreateDialog = false;
  }

  private _toggleDropdown(): void {
    this._dropdownOpen = !this._dropdownOpen;
    if (this._dropdownOpen) {
      this._focusedIndex = Math.max(0, this.channels.findIndex(c => c.id === this.selectedChannelId));
      document.addEventListener('click', this._closeDropdown);
    } else {
      document.removeEventListener('click', this._closeDropdown);
    }
  }

  private _closeDropdown = (): void => {
    this._dropdownOpen = false;
    document.removeEventListener('click', this._closeDropdown);
  };

  private _selectDropdownItem(channelId: string): void {
    this._dropdownOpen = false;
    document.removeEventListener('click', this._closeDropdown);
    emitPagesEvent(this, ChannelEventTopics.SELECT_CHANNEL, { channelId });
  }

  private _handleDropdownKeyDown(event: KeyboardEvent): void {
    if (this.channels.length === 0) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this._dropdownOpen) { this._toggleDropdown(); return; }
        this._focusedIndex = Math.min(this._focusedIndex + 1, this.channels.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._focusedIndex = Math.max(this._focusedIndex - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (this._dropdownOpen) {
          const focused = this.channels[this._focusedIndex];
          if (focused) this._selectDropdownItem(focused.id);
        } else {
          this._toggleDropdown();
        }
        break;
      case 'Escape':
        if (this._dropdownOpen) {
          event.preventDefault();
          this._closeDropdown();
        }
        break;
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._closeDropdown);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.channels.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this._focusedIndex = Math.min(this._focusedIndex + 1, this.channels.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._focusedIndex = Math.max(this._focusedIndex - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        const focused = this.channels[this._focusedIndex];
        if (focused) {
          this.handleChannelClick(focused.id);
        }
        break;
    }
  }

  override render() {
    if (this.layout === 'dropdown') {
      const selected = this.channels.find(c => c.id === this.selectedChannelId) ?? this.channels[0];
      const selectedCount = selected ? this.messageCounts[selected.id] : undefined;
      const triggerLabel = selected
        ? (selectedCount ? `${selected.name} (${selectedCount})` : selected.name)
        : '';
      return html`
        <div class="dropdown-wrapper" @click=${(e: Event) => e.stopPropagation()}>
          <pages-button class="dropdown-trigger" variant="ghost"
                  role="combobox"
                  aria-expanded=${this._dropdownOpen}
                  aria-haspopup="listbox"
                  @click=${() => this._toggleDropdown()}
                  @keydown=${this._handleDropdownKeyDown}>
            <span>${triggerLabel}</span>
            <span class="dropdown-arrow">${this._dropdownOpen ? '▲' : '▼'}</span>
          </pages-button>
          ${this._dropdownOpen ? html`
            <ul class="dropdown-panel" role="listbox">
              ${this.channels.map((channel, index) => {
                const count = this.messageCounts[channel.id];
                return html`
                  <li class="dropdown-option ${channel.id === this.selectedChannelId ? 'selected' : ''} ${index === this._focusedIndex ? 'focused' : ''}"
                      role="option"
                      aria-selected=${channel.id === this.selectedChannelId}
                      @click=${() => this._selectDropdownItem(channel.id)}>
                    <span>${channel.name}</span>
                    ${count ? html`<span class="dropdown-count">${count}</span>` : nothing}
                  </li>
                `;
              })}
            </ul>
          ` : nothing}
        </div>
      `;
    }

    return html`
      <ul class="channel-list" role="list" tabindex="0" @keydown="${this.handleKeyDown}">
        ${this.channels.map(
          (channel, index) => {
            const count = this.messageCounts[channel.id];
            return html`
              <li
                class="channel-item ${this.selectedChannelId === channel.id ? 'selected' : ''} ${index === this._focusedIndex ? 'focused' : ''}"
                role="option"
                aria-selected="${this.selectedChannelId === channel.id}"
                @click="${() => this.handleChannelClick(channel.id)}"
              >
                <span class="channel-icon">${this.getChannelIcon(channel.semantic)}</span>
                <span class="channel-name">${channel.name}</span>
                ${count ? html`<span class="message-count">${count}</span>` : nothing}
                ${this.showDelete ? html`
                  <pages-button variant="ghost" size="sm"
                    class="delete-btn"
                    aria-label="Delete channel ${channel.name}"
                    @click="${(e: MouseEvent) => this.handleDeleteClick(e, channel)}"
                  >
                    ✕
                  </pages-button>
                ` : nothing}
              </li>
            `;
          }
        )}
      </ul>
      ${this.showCreate ? html`
        <pages-button class="create-channel-btn" variant="ghost" size="sm" @click="${this.handleCreateChannel}">
          Create Channel
        </pages-button>
      ` : nothing}
      <blocks-confirm-dialog class="delete-dialog"
        .open=${!!this._deleteTarget}
        heading="Delete Channel"
        message=${this._deleteTarget ? `Delete channel "${this._deleteTarget.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        confirmVariant="danger"
        @confirm=${this._onDeleteConfirm}
        @cancel=${this._onDeleteCancel}
      ></blocks-confirm-dialog>
      <blocks-confirm-dialog class="create-dialog"
        .open=${this._showCreateDialog}
        heading="Create Channel"
        message="Enter a name for the new channel."
        confirmLabel="Create"
        confirmVariant="success"
        .showReason=${true}
        @confirm=${this._onCreateConfirm}
        @cancel=${this._onCreateCancel}
      ></blocks-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-channel-nav': ChannelNavElement;
  }
}
