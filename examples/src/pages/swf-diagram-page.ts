import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '@casehubio/blocks-ui-swf-diagram';

const PIPELINE_YAML = `document:
  dsl: 1.0.0-alpha1
  namespace: pipeline
  name: document-processing
  version: "1.0.0"
do:
  - receiveDocument:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/documents/receive
  - classifyDocument:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/ml/classify
  - extractText:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/ocr/extract
  - detectLanguage:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/nlp/detect-language
  - translateToEnglish:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/nlp/translate
  - extractEntities:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/nlp/extract-entities
  - resolveDuplicates:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/dedup/resolve
  - enrichMetadata:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/metadata/enrich
  - validateCompliance:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/compliance/validate
  - applyRetention:
      set:
        retentionPolicy: standard
        retentionYears: 7
  - generateSummary:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/ml/summarise
  - indexForSearch:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/search/index
  - notifyStakeholders:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/notifications/broadcast
  - archiveOriginal:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/archive/store
  - recordAuditTrail:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/audit/record
`;

const YAML = `document:
  dsl: 1.0.0-alpha1
  namespace: claims
  name: claim-review
  version: "2.0.0"
do:
  - fetchClaim:
      call: http
      with:
        method: get
        endpoint:
          uri: https://api.internal/claims/\${ .claimId }
  - validateEvidence:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/claims/validate
  - routeByRisk:
      switch:
        - lowRisk:
            when: '.riskScore < 30'
            then: autoApprove
        - mediumRisk:
            when: '.riskScore < 70'
            then: humanReview
        - highRisk:
            when: '.riskScore >= 70'
            then: siuReferral
  - autoApprove:
      set:
        decision: approved
        reason: 'Auto-approved: low risk score'
  - notifyBeneficiaries:
      for:
        each: beneficiary
        in: \${ .claim.beneficiaries }
      do:
        - sendLetter:
            call: http
            with:
              method: post
              endpoint:
                uri: https://api.internal/letters/send
        - recordDispatch:
            call: http
            with:
              method: post
              endpoint:
                uri: https://api.internal/dispatch/record
      then: tryNotify
  - humanReview:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/review-queue/assign
      then: tryNotify
  - siuReferral:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/siu/refer
      then: tryNotify
  - tryNotify:
      try:
        - sendNotification:
            call: http
            with:
              method: post
              endpoint:
                uri: https://api.internal/notifications/send
      catch:
        errors:
          with:
            type: https://serverlessworkflow.io/dsl/errors/types/communication
        do:
          - logNotifyFailure:
              set:
                notificationFailed: true
  - recordOutcome:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/audit/record
`;

const NESTED_YAML = `document:
  dsl: 1.0.0-alpha1
  namespace: underwriting
  name: nested-risk-assessment
  version: "1.0.0"
do:
  - ingestApplication:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/applications/ingest
  - classifyRisk:
      switch:
        - standardRisk:
            when: '.riskTier == "standard"'
            then: assessStandard
        - elevatedRisk:
            when: '.riskTier == "elevated"'
            then: triageElevated
        - declineRisk:
            when: '.riskTier == "decline"'
            then: autoDecline
  - assessStandard:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/underwriting/standard
      then: mergeDecision
  - triageElevated:
      switch:
        - medicalReview:
            when: '.elevatedReason == "medical"'
            then: orderMedicalRecords
        - financialReview:
            when: '.elevatedReason == "financial"'
            then: runCreditCheck
  - orderMedicalRecords:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/medical/request-records
      then: reviewElevated
  - runCreditCheck:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/financial/credit-check
      then: reviewElevated
  - reviewElevated:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/underwriting/elevated-review
      then: mergeDecision
  - autoDecline:
      set:
        decision: declined
        reason: 'Auto-declined: risk tier exceeds threshold'
      then: mergeDecision
  - mergeDecision:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/decisions/record
`;

const FOR_LOOP_YAML = `document:
  dsl: 1.0.0-alpha1
  namespace: batch
  name: batch-processing
  version: "1.0.0"
do:
  - fetchManifest:
      call: http
      with:
        method: get
        endpoint:
          uri: https://api.internal/manifests/latest
  - processItems:
      for:
        each: item
        in: .manifest.items
      do:
        - validateItem:
            call: http
            with:
              method: post
              endpoint:
                uri: https://api.internal/items/validate
        - transformItem:
            call: http
            with:
              method: post
              endpoint:
                uri: https://api.internal/items/transform
        - storeItem:
            call: http
            with:
              method: post
              endpoint:
                uri: https://api.internal/items/store
  - generateReport:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/reports/generate
  - notifyComplete:
      call: http
      with:
        method: post
        endpoint:
          uri: https://api.internal/notifications/send
`;

const EXAMPLES: Record<string, { label: string; description: string; yaml: string; direction?: 'DOWN' | 'RIGHT' }> = {
  'claim-review': {
    label: 'Claim Review (branching)',
    description: 'Three-way branching from risk assessment switch, try/catch error handling, 8 task types.',
    yaml: YAML,
  },
  'nested-risk': {
    label: 'Nested Risk Assessment',
    description: 'Nested switches — elevated risk branch splits again into medical vs financial review. Tests recursive column layout with variable-width branches.',
    yaml: NESTED_YAML,
  },
  'for-loop': {
    label: 'Batch Processing (for loop)',
    description: 'For-loop iterating over items — loop body rendered as a container block within the column.',
    yaml: FOR_LOOP_YAML,
  },
  'doc-pipeline': {
    label: 'Document Pipeline (sequential)',
    description: '15-step sequential pipeline — horizontal snake layout with ELK wrapping.',
    yaml: PIPELINE_YAML,
    direction: 'RIGHT',
  },
};

@customElement('blocks-example-swf-diagram')
export class SwfDiagramPage extends LitElement {
  @state() private _example = 'claim-review';

  static override styles = css`
    :host { display: flex; flex-direction: column; height: 100%; padding: 24px; box-sizing: border-box; }
    h2 { font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); margin-bottom: 8px; }
    p { color: var(--pages-neutral-11, #555); font-size: 14px; margin-bottom: 16px; }
    .controls { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
    label { font-size: 13px; font-weight: 500; color: var(--pages-neutral-11, #555); }
    select { padding: 4px 8px; border-radius: 4px; border: 1px solid var(--pages-neutral-6, #ccc);
      background: var(--pages-neutral-1, #fff); font-size: 13px; color: var(--pages-neutral-12, #111); }
    .diagram-container { flex: 1; min-height: 0; border: 1px solid var(--pages-neutral-5, #e0e0e0);
      border-radius: 6px; overflow: hidden; }
    swf-diagram { width: 100%; height: 100%; }
  `;

  override render() {
    const ex = EXAMPLES[this._example]!;
    return html`
      <h2>SWF Diagram</h2>
      <p>${ex.description} Stencil palette with 5 SWF task types (call, set, switch, raise, try).
        Click a node to edit properties via schema-driven palette with x-group annotations.</p>
      <div class="controls">
        <label>Example:</label>
        <select @change=${(e: Event) => { this._example = (e.target as HTMLSelectElement).value; }}>
          ${Object.entries(EXAMPLES).map(([k, v]) => html`
            <option value=${k} ?selected=${k === this._example}>${v.label}</option>
          `)}
        </select>
      </div>
      <div class="diagram-container">
        <swf-diagram .yaml=${ex.yaml} layout-direction=${ex.direction ?? 'DOWN'}></swf-diagram>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'blocks-example-swf-diagram': SwfDiagramPage; }
}
