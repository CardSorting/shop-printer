import type { CheckoutAttempt, Order, PaymentReconciliationCase } from '@domain/models';

export interface TimelineEvent {
  timestamp: string;
  previousPhase: string | null;
  nextPhase: string;
  previousWorkflowPhase: string | null;
  nextWorkflowPhase: string;
  previousStatus: string | null;
  nextStatus: string | null;
  authoritySource: string;
  actor: string;
  reason: string;
  attemptId: string;
  orderId: string | null;
  paymentIntentId: string | null;
  evidence: Array<{ type: string; value: string; recordedAt: string }>;
}

export interface EventCorrelationSummary {
  attemptId: string;
  orderId: string | null;
  paymentIntentId: string | null;
  fencingTokenMatches: boolean | null;
  stateAlignment: 'synchronized' | 'mismatched' | 'reconciliation_required' | 'stale_attempt';
  diagnoses: string[];
}

const RECONCILIATION_REASON_LABELS: Record<string, string> = {
  paid_not_finalized: 'Paid but not finalized',
  paid_cancelled: 'Paid after cancellation',
  dangling_payment_intent: 'Stripe payment has no local order',
  mapping_mismatch: 'Stripe/local order mapping mismatch',
  finalization_failure: 'Local finalization failed',
  fencing_token_mismatch: 'Checkout ownership conflict',
};

const FAILURE_CLASSIFICATION_LABELS: Record<string, string> = {
  transient_external: 'External system pending',
  local_persistence_failure: 'Local write failed',
  stripe_local_mismatch: 'Stripe/local mismatch',
  operator_required: 'Operator decision required',
  terminal_unrecoverable: 'Cannot safely recover automatically',
};

/**
 * Deterministically reconstructs the timeline of transitions for a checkout attempt.
 * Parses the nested `phaseTransitions` collection and returns chronologically sorted events.
 */
export function reconstructTimeline(attempt: Partial<CheckoutAttempt>): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (attempt.phaseTransitionEvidence && Array.isArray(attempt.phaseTransitionEvidence)) {
    // Collect from flat transition evidence if custom-formatted
  }

  // Parse `phaseTransitions` map
  const transitionsObj = (attempt as any).phaseTransitions;
  if (transitionsObj && typeof transitionsObj === 'object') {
    Object.keys(transitionsObj).forEach((key) => {
      const trans = transitionsObj[key];
      if (trans && typeof trans === 'object') {
        events.push({
          timestamp: trans.transitionedAt || new Date(Number(key)).toISOString(),
          previousPhase: trans.previousPhase || null,
          nextPhase: trans.nextPhase || 'unknown',
          previousWorkflowPhase: trans.previousWorkflowPhase || null,
          nextWorkflowPhase: trans.nextWorkflowPhase || 'unknown',
          previousStatus: trans.previousStatus || null,
          nextStatus: trans.nextStatus || null,
          authoritySource: trans.authoritySource || 'unknown',
          actor: trans.actor || 'system',
          reason: trans.reason || '',
          attemptId: trans.attemptId || attempt.id || '',
          orderId: trans.orderId || null,
          paymentIntentId: trans.paymentIntentId || null,
          evidence: Array.isArray(trans.evidence) ? trans.evidence : [],
        });
      }
    });
  }

  // Sort events chronologically by timestamp/transitionedAt
  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Renders the reconstructed timeline as a human-readable, structured markdown stream.
 */
export function renderTransitionStream(events: TimelineEvent[]): string {
  if (events.length === 0) {
    return '> *No checkout transition logs found.*';
  }

  let markdown = '### Checkout Transition Timeline Stream\n\n';
  markdown += '| Timestamp | Actor / Auth | Workflow Transition | Status Change | Reason |\n';
  markdown += '| :--- | :--- | :--- | :--- | :--- |\n';

  events.forEach((e) => {
    const time = e.timestamp.replace('T', ' ').substring(0, 19);
    const actorStr = `**${e.actor}** (${e.authoritySource})`;
    const transitionStr = `\`${e.previousWorkflowPhase || 'INIT'}\` -> \`${e.nextWorkflowPhase}\`<br><small>${e.previousPhase || 'init'} -> ${e.nextPhase}</small>`;
    const statusStr = e.previousStatus || e.nextStatus
      ? `\`${e.previousStatus || 'none'}\` -> \`${e.nextStatus || 'none'}\``
      : '*No change*';
    const reasonStr = e.reason ? `_${e.reason}_` : '-';

    markdown += `| ${time} | ${actorStr} | ${transitionStr} | ${statusStr} | ${reasonStr} |\n`;
  });

  return markdown;
}

/**
 * Correlates IDs, fencing tokens, and states across the attempt, order, and reconciliation case.
 */
export function correlateGroupedEvents(
  attempt: Partial<CheckoutAttempt> | null,
  order: Partial<Order> | null,
  reconciliationCase: Partial<PaymentReconciliationCase> | null
): EventCorrelationSummary {
  const attemptId = attempt?.id || reconciliationCase?.checkoutAttemptId || 'unknown';
  const orderId = order?.id || attempt?.orderId || reconciliationCase?.orderId || null;
  const paymentIntentId = attempt?.paymentIntentId || order?.paymentTransactionId || reconciliationCase?.paymentIntentId || null;

  let fencingTokenMatches: boolean | null = null;
  if (attempt && order) {
    const attemptToken = String(attempt.fencingToken || '');
    const orderToken = String(order.metadata?.fencingToken || '');
    fencingTokenMatches = attemptToken === orderToken;
  }

  const diagnoses: string[] = [];
  let stateAlignment: EventCorrelationSummary['stateAlignment'] = 'synchronized';

  if (!attempt) {
    diagnoses.push('CRITICAL: Checkout Attempt record is missing.');
    stateAlignment = 'reconciliation_required';
  }

  if (!order) {
    diagnoses.push('CRITICAL: Order record is missing.');
    stateAlignment = 'reconciliation_required';
  }

  if (attempt && order) {
    if (fencingTokenMatches === false) {
      diagnoses.push(`CONFLICT: Fencing token mismatch! Attempt token is '${attempt.fencingToken || 'none'}', but Order token is '${order.metadata?.fencingToken || 'none'}'.`);
      stateAlignment = 'reconciliation_required';
    }

    if (attempt.state === 'cancelled' && order.status !== 'cancelled') {
      diagnoses.push(`MISMATCH: Attempt is cancelled, but Order has status '${order.status}'.`);
      stateAlignment = 'reconciliation_required';
    }

    if (attempt.state === 'paid' && order.status === 'cancelled') {
      diagnoses.push(`CRITICAL CONFLICT: Attempt is marked paid, but Order has already been cancelled!`);
      stateAlignment = 'reconciliation_required';
    }

    const isStale = ['cancelled', 'restored', 'restore_blocked'].includes(attempt.state || '');
    if (isStale && order.paymentState === 'paid') {
      diagnoses.push(`STALE CONFLICT: Attempt was invalidated (${attempt.state}), but payment was successfully finalized on order.`);
      stateAlignment = 'stale_attempt';
    }
  }

  if (reconciliationCase) {
    diagnoses.push(`RECONCILIATION CASE ACTIVE: Case reason is '${reconciliationCase.reason}' (Classification: '${reconciliationCase.failureClassification || 'none'}').`);
    if (stateAlignment !== 'stale_attempt') {
      stateAlignment = 'reconciliation_required';
    }
  }

  if (diagnoses.length === 0) {
    diagnoses.push('OK: All system states and tokens are properly synchronized.');
  }

  return {
    attemptId,
    orderId,
    paymentIntentId,
    fencingTokenMatches,
    stateAlignment,
    diagnoses,
  };
}

/**
 * Generates an actionable markdown summary of reconciliation evidence for operators.
 */
export function generateReconciliationEvidenceSummary(reconciliationCase: Partial<PaymentReconciliationCase>): string {
  if (!reconciliationCase) {
    return '> *No active reconciliation case details provided.*';
  }

  const reason = reconciliationCase.reason || 'unknown';
  const classification = reconciliationCase.failureClassification || 'operator_required';
  const reasonLabel = RECONCILIATION_REASON_LABELS[reason] || reason;
  const classificationLabel = FAILURE_CLASSIFICATION_LABELS[classification] || classification;

  let markdown = `## Reconciliation Case: \`${reason}\`\n\n`;
  markdown += `**Summary:** ${reasonLabel}. ${classificationLabel}.\n\n`;
  markdown += `* **Status:** \`${reconciliationCase.lifecycleState || 'open'}\`\n`;
  markdown += `* **Severity:** \`${reconciliationCase.severity || 'unknown'}\`\n`;
  markdown += `* **Stripe:** \`${reconciliationCase.stripeStatus || 'unknown'}\`\n`;
  markdown += `* **Local state:** \`${reconciliationCase.lastObservedLocalState || 'unknown'}\`\n`;
  markdown += `* **Message:** ${reconciliationCase.operatorVisibleMessage || 'No description provided.'}\n\n`;

  markdown += '### Actions\n';
  markdown += `* **Next:** ${reconciliationCase.nextAction || 'Review the case and choose fulfillment, refund, or remap.'}\n`;
  markdown += `* **Fallback:** ${reconciliationCase.recommendedAction || 'Review Stripe transaction evidence manually.'}\n\n`;

  if (reconciliationCase.details) {
    markdown += '### Diagnostic Context Details\n';
    markdown += '```json\n';
    markdown += JSON.stringify(reconciliationCase.details, null, 2);
    markdown += '\n```\n';
  }

  return markdown;
}

/**
 * Performs state machine diagnostics and outputs a health summary with recommendations.
 */
export function runAuthoritativeDiagnostics(
  attempt: Partial<CheckoutAttempt> | null,
  order: Partial<Order> | null,
  reconciliationCase: Partial<PaymentReconciliationCase> | null
): { healthy: boolean; diagnostics: string[]; recommendations: string[] } {
  const correlation = correlateGroupedEvents(attempt, order, reconciliationCase);
  const healthy = correlation.stateAlignment === 'synchronized' && !reconciliationCase;
  const diagnostics = [...correlation.diagnoses];
  const recommendations: string[] = [];

  if (correlation.stateAlignment === 'synchronized') {
    recommendations.push('No action required. The system converged safely.');
  } else {
    if (correlation.fencingTokenMatches === false) {
      recommendations.push('Fencing token mismatch indicates concurrent scheduling. Reject stale operations and retain only the winning transaction.');
    }

    if (correlation.stateAlignment === 'stale_attempt') {
      recommendations.push('Stale attempt was paid: Ensure inventory is safely restored or manually verified. Do not overwrite already paid orders.');
    }

    if (reconciliationCase?.reason === 'paid_cancelled') {
      recommendations.push('Stripe payment succeeded after local order cancellation: Choose whether to fulfill the order (restoring inventory reservations) or refund the Stripe PaymentIntent.');
    }

    if (reconciliationCase?.reason === 'paid_not_finalized') {
      recommendations.push('Payment succeeded but local persistence failed: Manually invoke finalization retry helper to complete order provisioning.');
    }

    if (!order && attempt) {
      recommendations.push('Order missing: Review Firestore document replication logs. Recreate order document from CheckoutAttempt metadata if required.');
    }
  }

  return {
    healthy,
    diagnostics,
    recommendations,
  };
}
