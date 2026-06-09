import type { IOrderRepository } from '@domain/repositories';
import { logger } from '@utils/logger';
import type { ReconciliationOperatorAction } from './checkoutTypes';
import type { ICheckoutEventLog } from './checkoutEventLog';
import { operatorActionKey, recoveryAttemptKey } from './checkoutEventLog';
import { transitionCheckoutOrderState } from './checkoutOrderState';

export async function completeOperatorRetryRecoveryFlow(params: {
  orderRepo: IOrderRepository;
  eventLog: ICheckoutEventLog;
  caseId: string;
  reason: string;
  actor: { id: string; email: string };
  confirmPayment: (paymentIntentId: string, stripePi: null, actor: string) => Promise<unknown>;
  markCaseResolved: (input: {
    caseId: string;
    reason: string;
    actor: { id: string; email: string };
  }) => Promise<void>;
}): Promise<{ duplicate?: boolean }> {
  const kase = await params.orderRepo.getReconciliationCase(params.caseId);
  if (!kase || kase.reason !== 'paid_not_finalized') {
    return {};
  }

  const recoveryKey = recoveryAttemptKey(params.caseId);
  const recoveryClaim = await params.eventLog.claimRecoveryAttempt(recoveryKey);
  if (recoveryClaim === 'completed') {
    logger.info('checkout_recovery_attempt_duplicate', { caseId: params.caseId });
    return { duplicate: true };
  }
  if (recoveryClaim === 'in_progress') {
    logger.info('checkout_recovery_attempt_in_progress', { caseId: params.caseId });
    return { duplicate: true };
  }

  if (kase.orderId) {
    await transitionCheckoutOrderState({
      orderRepo: params.orderRepo,
      orderId: kase.orderId,
      from: ['reconciliation_required', 'recovery_pending', 'checkout_session_created', 'pending_payment'],
      to: 'recovery_pending',
      reason: params.reason,
      source: 'operator_retry_recovery',
      paymentIntentId: kase.paymentIntentId,
      reconciliationCaseId: params.caseId,
    });
  }

  try {
    await params.confirmPayment(kase.paymentIntentId, null, params.actor.email);
    await params.markCaseResolved({
      caseId: params.caseId,
      reason: `Automated recovery retry completed successfully: ${params.reason}`,
      actor: params.actor,
    });
    await params.eventLog.markRecoveryAttemptCompleted(recoveryKey);
    if (kase.orderId) {
      await transitionCheckoutOrderState({
        orderRepo: params.orderRepo,
        orderId: kase.orderId,
        from: 'recovery_pending',
        to: 'recovered',
        reason: params.reason,
        source: 'operator_retry_recovery',
        paymentIntentId: kase.paymentIntentId,
        reconciliationCaseId: params.caseId,
      });
    }
    return {};
  } catch (error: any) {
    await params.eventLog.markRecoveryAttemptFailed(recoveryKey, error.message);
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
  eventLog: ICheckoutEventLog;
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
  }) => Promise<{ duplicate?: boolean }>;
}): Promise<{ duplicate?: boolean }> {
  if (params.action === 'retry_recovery') {
    const actionKey = operatorActionKey(params.caseId, params.action, params.actor.id);
    const claim = await params.eventLog.claimOperatorAction(actionKey);
    if (claim === 'completed') {
      logger.info('checkout_operator_action_duplicate', { caseId: params.caseId, action: params.action });
      return { duplicate: true };
    }
  }

  await params.recordOperatorAction({
    caseId: params.caseId,
    action: params.action,
    reason: params.reason,
    actor: params.actor,
  });

  if (params.action !== 'retry_recovery') {
    return {};
  }

  const recoveryResult = await params.runRetryRecovery({
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

  if (!recoveryResult.duplicate) {
    const actionKey = operatorActionKey(params.caseId, params.action, params.actor.id);
    await params.eventLog.markOperatorActionCompleted(actionKey);
  }

  return recoveryResult;
}
