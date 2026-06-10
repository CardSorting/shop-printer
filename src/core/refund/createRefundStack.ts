import type { IOrderRepository } from '@domain/repositories';
import type { RefundService } from '../RefundService';
import { RefundFlowService } from './RefundFlowService';
import type { IRefundEventLog } from './refundEventLog';

export type RefundStackDeps = {
  refundService: RefundService;
  orderRepo: IOrderRepository;
  eventLog: IRefundEventLog;
};

export type RefundStack = {
  refunds: RefundFlowService;
};

export function createRefundStack(deps: RefundStackDeps): RefundStack {
  return {
    refunds: new RefundFlowService(deps.refundService, deps.orderRepo, deps.eventLog),
  };
}
