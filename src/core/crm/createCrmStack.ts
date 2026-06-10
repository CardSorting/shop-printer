import type { IAdminOperatorEventLog } from '../admin/adminOperatorEventLog';
import { CrmFlowService } from './CrmFlowService';
import { CustomerService } from './CustomerService';
import type { AuthService } from '../AuthService';
import type { OrderQueryService } from '../OrderQueryService';
import type { ITicketRepository } from '@domain/repositories';
import type { ICommerceEventBus } from '../commerce/commerceEventBus';

export type CrmStackDeps = {
  authService: AuthService;
  orderQueryService: OrderQueryService;
  ticketRepo?: ITicketRepository;
  operatorEventLog: IAdminOperatorEventLog;
  commerceEventBus?: ICommerceEventBus;
};

export type CrmStack = {
  crm: CrmFlowService;
};

export function createCrmStack(deps: CrmStackDeps): CrmStack {
  const customers = new CustomerService(deps.authService, deps.orderQueryService, deps.ticketRepo);
  return {
    crm: new CrmFlowService({
      customers,
      operatorEventLog: deps.operatorEventLog,
      commerceEventBus: deps.commerceEventBus,
    }),
  };
}
