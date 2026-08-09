import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../../../components/grouped-data-view/src/grouped-data-view.js';
import '@casehubio/pages-viz/components/grouped-view/PagesGroupedView.js';
import type { GroupStyleConfig } from '../../../components/grouped-data-view/src/types.js';
import itemData from '../../mock-data/grouped-items.json';
import { fromRows } from '@casehubio/pages-data/dist/dataset/conversion.js';
import { columnId, ColumnType } from '@casehubio/pages-data/dist/dataset/types.js';
import type { TypedDataSet } from '@casehubio/pages-data/dist/dataset/types.js';

interface QueueItem {
  lane: string;
  title: string;
  author: string;
  waitTime: string;
  trustScore: number;
}

const COLUMNS = [
  { id: columnId('lane'), name: 'Lane', type: ColumnType.LABEL, getValue: (r: QueueItem) => r.lane },
  { id: columnId('title'), name: 'Title', type: ColumnType.TEXT, getValue: (r: QueueItem) => r.title },
  { id: columnId('author'), name: 'Author', type: ColumnType.TEXT, getValue: (r: QueueItem) => r.author },
  { id: columnId('waitTime'), name: 'Wait Time', type: ColumnType.TEXT, getValue: (r: QueueItem) => r.waitTime },
  { id: columnId('trustScore'), name: 'Trust Score', type: ColumnType.NUMBER, getValue: (r: QueueItem) => r.trustScore },
];

const LANE_CONFIG: Map<string, GroupStyleConfig> = new Map([
  ['CRITICAL', { className: 'lane-critical', icon: '🔴', label: 'Critical' }],
  ['HIGH', { className: 'lane-high', icon: '🟠', label: 'High Priority' }],
  ['NORMAL', { className: 'lane-normal', icon: '🟢', label: 'Normal' }],
]);

@customElement('blocks-example-grouped-data-view')
export class GroupedDataViewPage extends LitElement {
  @state() private _eventLog: string[] = [];
  @state() private _dataSet: TypedDataSet;

  constructor() {
    super();
    this._dataSet = fromRows(itemData.items as QueueItem[], COLUMNS);
  }

  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { margin-bottom: 8px; font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); }
    p { margin-bottom: 24px; color: var(--pages-neutral-11, #555); font-size: 14px; }
    h3 { margin: 24px 0 12px; font-size: 16px; font-weight: 600; }
    .demo-section { margin-bottom: 32px; padding: 16px; border: 1px solid var(--pages-neutral-5, #e0e0e0); border-radius: 6px; background: var(--pages-neutral-1, #fff); }
    .event-log { margin-top: 24px; padding: 16px; background: var(--pages-neutral-2, #f5f5f5); border-radius: 8px; max-height: 150px; overflow-y: auto; }
    .event-log h3 { margin: 0 0 8px; font-size: 14px; }
    .event-log pre { margin: 0; font-size: 13px; font-family: monospace; white-space: pre-wrap; }
  `;

  private _handleEvent(e: CustomEvent) {
    const { topic, payload } = e.detail;
    this._eventLog = [
      `[${new Date().toLocaleTimeString()}] ${topic}: ${JSON.stringify(payload)}`,
      ...this._eventLog.slice(0, 9),
    ];
  }

  override render() {
    return html`
      <h2>Grouped Data View</h2>
      <p>Items grouped by a key column with per-group pages-table rendering. Thin wrapper over pages-grouped-view.</p>

      <h3>Sectioned with Lane Styling</h3>
      <div class="demo-section" @pages-event=${this._handleEvent}>
        <blocks-grouped-data-view
          group-by="lane"
          .groupOrder=${['CRITICAL', 'HIGH', 'NORMAL']}
          .groupConfig=${LANE_CONFIG}
          .dataSet=${this._dataSet}
          sortable
        ></blocks-grouped-data-view>
      </div>

      <h3>Spreadsheet Preset</h3>
      <div class="demo-section">
        <blocks-grouped-data-view
          group-by="lane"
          preset="spreadsheet"
          .dataSet=${this._dataSet}
        ></blocks-grouped-data-view>
      </div>

      <h3>Empty State</h3>
      <div class="demo-section">
        <blocks-grouped-data-view group-by="lane"></blocks-grouped-data-view>
      </div>

      ${this._eventLog.length > 0 ? html`
        <div class="event-log">
          <h3>Event Log</h3>
          <pre>${this._eventLog.join('\n')}</pre>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'grouped-data-view-page': GroupedDataViewPage;
  }
}
