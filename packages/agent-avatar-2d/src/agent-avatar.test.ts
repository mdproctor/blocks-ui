import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './agent-avatar.js';

type AgentAvatarEl = HTMLElement & {
  disposition?: { socialOrient?: { term: string; weight: number }[] };
  size?: string;
  updateComplete: Promise<boolean>;
};

describe('agent-avatar', () => {
  let el: AgentAvatarEl;

  beforeEach(() => {
    el = document.createElement('agent-avatar') as AgentAvatarEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('renders an SVG', async () => {
    await el.updateComplete;
    const svg = el.shadowRoot!.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('has ARIA role=img and aria-label', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Agent avatar');
  });

  it('accepts disposition property', async () => {
    el.disposition = { socialOrient: [{ term: 'collaborative', weight: 1.0 }] };
    await el.updateComplete;
    const svg = el.shadowRoot!.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
