import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './agent-wizard.js';

type WizardEl = HTMLElement & {
  updateComplete: Promise<boolean>;
};

function getStep(el: WizardEl): string | null {
  const indicator = el.shadowRoot!.querySelector('.step-indicator .active');
  return indicator?.textContent?.trim() ?? null;
}

function getAllSteps(el: WizardEl): string[] {
  const indicators = el.shadowRoot!.querySelectorAll('.step-indicator .step');
  return Array.from(indicators).map(s => s.textContent?.trim() ?? '');
}

function clickNext(el: WizardEl) {
  const btn = el.shadowRoot!.querySelector('.btn-next') as HTMLElement | null;
  btn?.click();
}

function clickBack(el: WizardEl) {
  const btn = el.shadowRoot!.querySelector('.btn-back') as HTMLElement | null;
  btn?.click();
}

describe('agent-wizard', () => {
  let el: WizardEl;

  beforeEach(() => {
    el = document.createElement('agent-wizard') as WizardEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('has ARIA role=form and aria-label', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('form');
    expect(el.getAttribute('aria-label')).toBe('Create custom agent');
  });

  it('renders 6 step indicators', async () => {
    await el.updateComplete;
    const steps = getAllSteps(el);
    expect(steps).toHaveLength(6);
  });

  it('starts on step 1 (Identity)', async () => {
    await el.updateComplete;
    const activeStep = getStep(el);
    expect(activeStep).toBe('Identity');
  });

  it('step 1 has name, domain, and slot inputs', async () => {
    await el.updateComplete;
    const nameInput = el.shadowRoot!.querySelector('input[data-field="name"]') as HTMLInputElement;
    const slotInput = el.shadowRoot!.querySelector('input[data-field="slot"]') as HTMLInputElement;
    const domainInput = el.shadowRoot!.querySelector('input[data-field="domain"]') as HTMLInputElement;
    expect(nameInput).toBeTruthy();
    expect(slotInput).toBeTruthy();
    expect(domainInput).toBeTruthy();
  });

  it('navigates forward on next', async () => {
    await el.updateComplete;
    clickNext(el);
    await el.updateComplete;
    const activeStep = getStep(el);
    expect(activeStep).toBe('Capabilities');
  });

  it('navigates back on back', async () => {
    await el.updateComplete;
    clickNext(el);
    await el.updateComplete;
    clickBack(el);
    await el.updateComplete;
    const activeStep = getStep(el);
    expect(activeStep).toBe('Identity');
  });

  it('back button is hidden on step 1', async () => {
    await el.updateComplete;
    const backBtn = el.shadowRoot!.querySelector('.btn-back');
    expect(backBtn).toBeNull();
  });

  it('step 2 has capability add and delegation toggle', async () => {
    await el.updateComplete;
    clickNext(el);
    await el.updateComplete;
    const addBtn = el.shadowRoot!.querySelector('.add-capability');
    const delegationToggle = el.shadowRoot!.querySelector('input[data-field="delegation"]');
    expect(addBtn).toBeTruthy();
    expect(delegationToggle).toBeTruthy();
  });

  it('step 3 renders disposition axis pickers', async () => {
    await el.updateComplete;
    clickNext(el);
    await el.updateComplete;
    clickNext(el);
    await el.updateComplete;
    const axisPickers = el.shadowRoot!.querySelectorAll('.axis-picker');
    expect(axisPickers.length).toBe(5);
  });

  it('step 3 has advanced toggle for multi-term', async () => {
    await el.updateComplete;
    clickNext(el);
    await el.updateComplete;
    clickNext(el);
    await el.updateComplete;
    const advancedToggle = el.shadowRoot!.querySelector('.advanced-toggle');
    expect(advancedToggle).toBeTruthy();
  });

  it('step 6 shows avatar preview', async () => {
    await el.updateComplete;
    for (let i = 0; i < 5; i++) {
      clickNext(el);
      await el.updateComplete;
    }
    const activeStep = getStep(el);
    expect(activeStep).toBe('Avatar');
    const avatar = el.shadowRoot!.querySelector('agent-avatar');
    expect(avatar).toBeTruthy();
  });

  it('emits agent:created on finish with valid descriptor', async () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler as EventListener);
    await el.updateComplete;

    const nameInput = el.shadowRoot!.querySelector('input[data-field="name"]') as HTMLInputElement;
    nameInput.value = 'Test Agent';
    nameInput.dispatchEvent(new Event('input'));

    for (let i = 0; i < 5; i++) {
      clickNext(el);
      await el.updateComplete;
    }

    const finishBtn = el.shadowRoot!.querySelector('.btn-finish') as HTMLElement;
    expect(finishBtn).toBeTruthy();
    finishBtn.click();

    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('agent:created');
    expect(detail.payload.name).toBe('Test Agent');
    expect(detail.payload.agentId).toBeTruthy();
    expect(detail.payload.tenancyId).toBe('');
  });

  it('renders preview panel that builds up progressively', async () => {
    await el.updateComplete;
    const preview = el.shadowRoot!.querySelector('.preview-panel');
    expect(preview).toBeTruthy();
  });
});
