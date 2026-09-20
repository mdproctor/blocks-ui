import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../../../components/agent-manifest-editor/src/agent-manifest-editor.js';
import type { Manifest } from '@casehubio/blocks-ui-core';

@customElement('blocks-example-agent-manifest-editor')
export class AgentManifestEditorPage extends LitElement {
  @state() private _eventLog: string[] = [];
  @state() private _configuredManifest: Manifest | null = null;

  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { margin-bottom: 8px; font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); }
    p { margin-bottom: 24px; color: var(--pages-neutral-11, #555); font-size: 14px; }
    h3 { margin: 24px 0 12px; font-size: 16px; font-weight: 600; }
    .demo-section {
      padding: 16px;
      border: 1px solid var(--pages-neutral-5, #e0e0e0);
      border-radius: 6px;
      background: var(--pages-neutral-1, #fff);
      margin-bottom: 24px;
    }
    .event-log {
      margin-top: 24px;
      padding: 16px;
      background: var(--pages-neutral-2, #f5f5f5);
      border-radius: 8px;
      max-height: 200px;
      overflow-y: auto;
    }
    .event-log h3 { margin: 0 0 8px; font-size: 14px; }
    .event-log pre { margin: 0; font-size: 12px; font-family: monospace; white-space: pre-wrap; }
  `;

  private _handleEvent(e: CustomEvent) {
    if (e.detail.topic === 'manifest:configured') {
      this._configuredManifest = e.detail.payload;
      this._eventLog = [
        `[${new Date().toLocaleTimeString()}] manifest:configured — ${e.detail.payload?.providers?.length ?? 0} provider(s)`,
        ...this._eventLog.slice(0, 9),
      ];
    }
  }

  override render() {
    return html`
      <h2>Agent Manifest Editor</h2>
      <p>LLM provider/model/credential configuration with presets and auto-detection.</p>

      <div class="demo-section" @pages-event=${this._handleEvent}>
        <agent-manifest-editor></agent-manifest-editor>
      </div>

      ${this._configuredManifest ? html`
        <h3>Configured Manifest</h3>
        <div class="demo-section">
          <pre>${JSON.stringify(this._configuredManifest, null, 2)}</pre>
        </div>
      ` : ''}

      ${this._eventLog.length > 0 ? html`
        <div class="event-log">
          <h3>Event Log</h3>
          <pre>${this._eventLog.join('\n')}</pre>
        </div>
      ` : ''}
    `;
  }
}
