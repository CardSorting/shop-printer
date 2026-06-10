import type { ITicketRepository } from '@domain/repositories';
import type { OrderQueryService } from '../OrderQueryService';
import { SupportFlowService } from './SupportFlowService';
import type { ISupportEventLog } from './supportEventLog';
import type { ICommerceEventBus } from '../commerce/commerceEventBus';

export type SupportStackDeps = {
  ticketRepo: ITicketRepository;
  orderQueryService?: OrderQueryService;
  eventLog: ISupportEventLog;
  commerceEventBus?: ICommerceEventBus;
};

export type SupportStack = {
  support: SupportFlowService;
};

export function createSupportStack(deps: SupportStackDeps): SupportStack {
  return {
    support: new SupportFlowService(deps),
  };
}
