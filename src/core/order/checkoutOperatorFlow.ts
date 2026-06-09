import type { IOrderRepository } from '@domain/repositories';
import { logger } from '@utils/logger';
import type { ReconciliationOperatorAction } from './checkoutTypes';

export async function completeOperatorRetryRecoveryFlow(params: {
  orderRepo: IOrderRepository;
  caseId: string;
  reason: string;
  actor: { id: string; email: string };
  confirmPayment: (paymentIntentId: string, stripePi: null, actor: string) => Promise<unknown>;
  markCaseResolved: (input: {
    caseId: string;
    reason: string;
    actor: { id: string; email: string };
  }) => Promise<void>;
}): Promise<void> {
  const kase = await params.orderRepo.getReconciliationCase(params.caseId);
  if (!kase || kase.reason !== 'paid_not_finalized') {
    return;
  }

  try {
    await params.confirmPayment(kase.paymentIntentId, null, params.actor.email);
    await params.markCaseResolved({
      caseId: params.caseId,
      reason: `Automated recovery retry completed successfully: ${params.reason}`,
      actor: params.actor,
    });
  } catch (error: any) {
    logger.error('reconciliation_operator_action_retry_recovery_failed', { caseId: params.caseId, error });

    await params.orderRepo.createOrUpdateReconciliationCase({
      paymentIntentId: kase.paymentIntentId,
      reason: kase.reason,
      severity: kase.severity,
      lifecycleState: 'repair_attempted',
      repairAttempt: {
        attemptedAt: new Date().toISOString(),
        error: error.message,
      },
      evidence: [
        ...(kase.evidence || []),
        {
          type: 'recovery_failure',
          value: `Automated recovery attempt failed: ${error.message}`,
          recordedAt: new Date().toISOString(),
        },
      ],
      operatorVisibleMessage: kase.operatorVisibleMessage,
      nextAction: 'Automated recovery failed. Manual intervention or escalation required.',
    });

    throw new Error(`Automated recovery failed: ${error.message}`);
  }
}

export async function handleReconciliationOperatorActionFlow(params: {
  caseId: string;
  action: ReconciliationOperatorAction;
  reason: string;
  actor: { id: string; email: string };
  recordOperatorAction: (input: {
    caseId: string;
    action: ReconciliationOperatorAction;
    reason: string;
    actor: { id: string; email: string };
  }) => Promise<void>;
  runRetryRecovery: (input: {
    caseId: string;
    reason: string;
    actor: { id: string; email: string };
    markCaseResolved: (input: {
      caseId: string;
      reason: string;
      actor: { id: string; email: string };
    }) => Promise<void>;
  }) => Promise<void>;
}): Promise<void> {
  await params.recordOperatorAction({
    caseId: params.caseId,
    action: params.action,
    reason: params.reason,
    actor: params.actor,
  });

  if (params.action !== 'retry_recovery') {
    return;
  }

  await params.runRetryRecovery({
    caseId: params.caseId,
    reason: params.reason,
    actor: params.actor,
    markCaseResolved: (input) => params.recordOperatorAction({
      caseId: input.caseId,
      action: 'mark_resolved',
      reason: input.reason,
      actor: input.actor,
    }),
  });
}
