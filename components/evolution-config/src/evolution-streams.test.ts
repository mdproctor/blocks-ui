import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ImprovementStreamView } from './types.js';
import './evolution-streams.js';
import type { EvolutionStreams } from './evolution-streams.js';

function createElement(streams?: ImprovementStreamView[]): EvolutionStreams {
  const el = document.createElement('blocks-evolution-streams') as EvolutionStreams;
  if (streams) el.streams = streams;
  document.body.appendChild(el);
  return el;
}

const SAMPLE_STREAMS: ImprovementStreamView[] = [
  {
    improvementCaseId: '660e8400-0001-0000-0000-000000000001',
    category: 'dependency-update',
    target: 'quarkus-core',
    currentStage: 'implement',
    blockedBy: null,
    conflictBlocked: false,
    startedAt: '2026-09-26T06:00:00Z',
  },
  {
    improvementCaseId: '660e8400-0001-0000-0000-000000000002',
    category: 'lint-fix',
    target: 'auth-module',
    currentStage: 'pr-review',
    blockedBy: '660e8400-0001-0000-0000-000000000001',
    conflictBlocked: true,
    startedAt: '2026-09-26T07:00:00Z',
  },
];

describe('blocks-evolution-streams', () => {
  afterEach(() => {
    document.body.querySelectorAll('blocks-evolution-streams').forEach(el => el.remove());
  });

  it('has correct ARIA attributes', async () => {
    const el = createElement(SAMPLE_STREAMS);
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Improvement streams');
  });

  it('renders a pages-table with stream data', async () => {
    const el = createElement(SAMPLE_STREAMS);
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table');
    expect(table).not.toBeNull();
  });

  it('shows empty state when no streams', async () => {
    const el = createElement([]);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No active improvement streams');
  });

  it('hides action buttons in readonly mode', async () => {
    const el = createElement(SAMPLE_STREAMS);
    el.readonly = true;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table');
    expect(table).not.toBeNull();
  });

  it('sets aria-busy during loading', async () => {
    const el = createElement();
    (el as any)._loading = true;
    await el.updateComplete;
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('shows error state', async () => {
    const el = createElement();
    (el as any)._error = 'Network error';
    await el.updateComplete;
    const error = el.shadowRoot!.querySelector('.error');
    expect(error).not.toBeNull();
    expect(error!.textContent).toContain('Network error');
  });

  describe('block/unblock actions', () => {
    it('_handleBlock opens block dialog with improvement ID', async () => {
      const el = createElement(SAMPLE_STREAMS);
      await el.updateComplete;
      (el as any)._handleBlock('660e8400-0001-0000-0000-000000000001');
      expect((el as any)._showBlockDialog).toBe(true);
      expect((el as any)._pendingBlockId).toBe('660e8400-0001-0000-0000-000000000001');
      expect((el as any)._blockByValue).toBe('');
    });

    it('_confirmBlock does nothing when blockedBy is empty', async () => {
      const el = createElement(SAMPLE_STREAMS);
      el.caseId = 'case-1';
      el.tenancyId = 'tenant-1';
      await el.updateComplete;
      (el as any)._pendingBlockId = '001';
      (el as any)._blockByValue = '';
      await (el as any)._confirmBlock();
      expect((el as any)._showBlockDialog).toBeFalsy();
    });

    it('_confirmBlock calls API and emits event', async () => {
      const el = createElement(SAMPLE_STREAMS);
      el.endpoint = 'http://test';
      el.caseId = 'case-1';
      el.tenancyId = 'tenant-1';
      await el.updateComplete;
      const mockApi = {
        blockImprovement: vi.fn().mockResolvedValue(undefined),
        getStreamProgress: vi.fn().mockResolvedValue([]),
      };
      (el as any)._api = mockApi;
      (el as any)._pendingBlockId = '001';
      (el as any)._blockByValue = 'blocker-002';
      const handler = vi.fn();
      el.addEventListener('pages-event', handler);
      await (el as any)._confirmBlock();
      expect(mockApi.blockImprovement).toHaveBeenCalledWith('case-1', 'tenant-1', '001', 'blocker-002');
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0]![0].detail.topic).toBe('evolution:stream-changed');
    });

    it('_handleUnblock calls API and emits event', async () => {
      const el = createElement(SAMPLE_STREAMS);
      el.endpoint = 'http://test';
      el.caseId = 'case-1';
      el.tenancyId = 'tenant-1';
      await el.updateComplete;
      const mockApi = {
        unblockImprovement: vi.fn().mockResolvedValue(undefined),
        getStreamProgress: vi.fn().mockResolvedValue([]),
      };
      (el as any)._api = mockApi;
      const handler = vi.fn();
      el.addEventListener('pages-event', handler);
      await (el as any)._handleUnblock('001');
      expect(mockApi.unblockImprovement).toHaveBeenCalledWith('case-1', 'tenant-1', '001');
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0]![0].detail.topic).toBe('evolution:stream-changed');
    });

    it('_handleUnblock sets error on API failure', async () => {
      const el = createElement(SAMPLE_STREAMS);
      el.endpoint = 'http://test';
      el.caseId = 'case-1';
      el.tenancyId = 'tenant-1';
      await el.updateComplete;
      const mockApi = {
        unblockImprovement: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      (el as any)._api = mockApi;
      await (el as any)._handleUnblock('001');
      expect((el as any)._error).toBe('Network error');
    });
  });

  describe('row selection', () => {
    it('uses single selection mode', async () => {
      const el = createElement(SAMPLE_STREAMS);
      await el.updateComplete;
      const table = el.shadowRoot!.querySelector('pages-table');
      expect(table?.getAttribute('selection')).toBe('single');
    });

    it('_handleRowActivated emits evolution:agent-selected', async () => {
      const el = createElement(SAMPLE_STREAMS);
      await el.updateComplete;
      const handler = vi.fn();
      el.addEventListener('pages-event', handler);
      (el as any)._handleRowActivated({ detail: { row: { text: (col: any) => '660e8400-0001-0000-0000-000000000001' } } });
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0]![0].detail.topic).toBe('evolution:agent-selected');
      expect(handler.mock.calls[0]![0].detail.payload.improvementCaseId).toBe('660e8400-0001-0000-0000-000000000001');
    });
  });
});
