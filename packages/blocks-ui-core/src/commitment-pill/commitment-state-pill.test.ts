import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CommitmentState } from '../types/commitment.js';
import './commitment-state-pill.js';

type PillEl = HTMLElement & {
  state: CommitmentState;
  size: 'sm' | 'md';
  showIcon: boolean;
  updateComplete: Promise<boolean>;
};

describe('commitment-state-pill', () => {
  let el: PillEl;

  beforeEach(async () => {
    el = document.createElement('commitment-state-pill') as PillEl;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('renders nothing when no state set', () => {
    expect(el.shadowRoot!.querySelector('.pill')).toBeNull();
  });

  it('renders the state label', async () => {
    el.state = 'OPEN';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('OPEN');
  });

  it.each([
    'OPEN', 'ACKNOWLEDGED', 'FULFILLED', 'FAILED',
    'DECLINED', 'DELEGATED', 'EXPIRED',
  ] as CommitmentState[])('renders %s state', async (state) => {
    el.state = state;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain(state);
  });

  it('defaults to sm size', () => {
    expect(el.size).toBe('sm');
  });

  it('applies md size styles', async () => {
    el.state = 'OPEN';
    el.size = 'md';
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('.pill') as HTMLElement;
    expect(pill).toBeTruthy();
    expect(pill.style.fontSize).toBeTruthy();
  });

  it('shows icon when showIcon is true', async () => {
    el.state = 'FULFILLED';
    el.showIcon = true;
    await el.updateComplete;
    const icon = el.shadowRoot!.querySelector('.icon');
    expect(icon).toBeTruthy();
  });

  it('hides icon by default', async () => {
    el.state = 'OPEN';
    await el.updateComplete;
    const icon = el.shadowRoot!.querySelector('.icon');
    expect(icon).toBeNull();
  });

  it('has aria-label with state name', async () => {
    el.state = 'ACKNOWLEDGED';
    await el.updateComplete;
    const pill = el.shadowRoot!.querySelector('.pill');
    expect(pill?.getAttribute('aria-label')).toContain('ACKNOWLEDGED');
  });

  it('re-renders on state change', async () => {
    el.state = 'OPEN';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('OPEN');
    el.state = 'FULFILLED';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('FULFILLED');
    expect(el.shadowRoot!.textContent).not.toContain('OPEN');
  });
});
