import * as crypto from 'node:crypto';
import type { IOrderRepository } from '@domain/repositories';
import { OrderNotFoundError } from '@domain/errors';
import type { RefundService } from '../RefundService';
import type { RefundApplicationService } from './refundApplicationService';
import type { CreateRefundInput, GetRefundStatusInput } from './refundApplicationService';
import type { IRefundEventLog } from './refundEventLog';
import { refundErr, refundFromError, refundOk } from './refundResult';
import type { ICommerceEventBus } from '../commerce/commerceEventBus';
import { mapRefundEventToEnvelope } from '../commerce/commerceEventMappers';

export class RefundFlowService implements RefundApplicationService {
  constructor(
    private refundService: RefundService,
    private orderRepo: IOrderRepository,
    private eventLog: IRefundEventLog,
    private commerceEventBus?: ICommerceEventBus,
  ) {}

  async createRefund(input: CreateRefundInput) {
    if (!input.actor?.id?.trim() || !input.actor?.email?.trim()) {
      return refundErr('VALIDATION_FAILED', 'actor is required for refund authorization.', false);
    }
    if (!input.reason?.trim()) {
      return refundErr('VALIDATION_FAILED', 'reason is required for refund.', false);
    }
    if (!input.idempotencyKey?.trim()) {
      return refundErr('VALIDATION_FAILED', 'idempotencyKey is required for refund idempotency.', false);
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return refundErr('VALIDATION_FAILED', 'Refund amount must be a positive number.', false);
    }

    const claim = await this.eventLog.claimRefundExecution(input.idempotencyKey);
    if (claim === 'completed') {
      const prior = await this.eventLog.findByIdempotencyKey(input.idempotencyKey);
      if (prior) {
        const order = await this.orderRepo.getById(prior.orderId);
        const status = order?.status === 'refunded'
          ? 'refunded'
          : 'partially_refunded';
        return refundOk({
          orderId: prior.orderId,
          amount: prior.amount,
          status,
          stripeRefundId: prior.stripeRefundId,
          idempotencyKey: input.idempotencyKey,
        }, true);
      }

      const result = await this.refundService.processRefund(
        input.orderId,
        input.amount,
        input.actor,
        input.idempotencyKey,
      );
      return refundOk({
        orderId: result.orderId,
        amount: result.amount,
        status: result.status,
        stripeRefundId: result.stripeRefundId,
        idempotencyKey: result.idempotencyKey,
      }, true);
    }

    try {
      const result = await this.refundService.processRefund(
        input.orderId,
        input.amount,
        input.actor,
        input.idempotencyKey,
      );

      const executionEvent = {
        id: crypto.randomUUID(),
        idempotencyKey: input.idempotencyKey,
        orderId: result.orderId,
        amount: result.amount,
        stripeRefundId: result.stripeRefundId,
        actorId: input.actor.id,
        actorEmail: input.actor.email,
        reason: input.reason,
        source: input.source ?? 'system',
        createdAt: new Date().toISOString(),
      };
      await this.eventLog.recordExecution(executionEvent);
      if (this.commerceEventBus) {
        await this.commerceEventBus.publish(mapRefundEventToEnvelope(executionEvent));
      }
      await this.eventLog.markRefundExecutionCompleted(input.idempotencyKey);

      return refundOk({
        orderId: result.orderId,
        amount: result.amount,
        status: result.status,
        stripeRefundId: result.stripeRefundId,
        idempotencyKey: result.idempotencyKey,
      }, result.duplicate);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Refund failed';
      await this.eventLog.markRefundExecutionFailed(input.idempotencyKey, message).catch(() => {});
      return refundFromError(error);
    }
  }

  async getRefundStatus(input: GetRefundStatusInput) {
    try {
      const order = await this.orderRepo.getById(input.orderId);
      if (!order) throw new OrderNotFoundError(input.orderId);
      const refundedAmount = order.refundedAmount || 0;
      const refundableBalance = Math.max(0, order.total - refundedAmount);
      const processedRefundKeys = order.metadata?.processedRefundKeys || [];
      const stripeRefunds = (order.metadata?.stripeRefunds as Array<{ id: string; amount: number; idempotencyKey: string }>) || [];
      return refundOk({
        orderId: input.orderId,
        refundedAmount,
        refundableBalance,
        processedRefundKeys,
        stripeRefunds,
      });
    } catch (error) {
      return refundFromError(error);
    }
  }
}