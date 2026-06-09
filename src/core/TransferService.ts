import type { Transfer } from '@domain/models';
import type { ITransferRepository, IProductRepository } from '@domain/repositories';
import { runTransaction, getUnifiedDb } from '@infrastructure/firebase/bridge';
import { DomainError } from '@domain/errors';
import { AuditService } from './AuditService';
import type { InventoryApplicationService } from './inventory/inventoryApplicationService';

export class TransferService {
  constructor(
    private transferRepo: ITransferRepository,
    private productRepo: IProductRepository,
    private audit: AuditService,
    private inventory: InventoryApplicationService,
  ) {}

  async getAllTransfers(): Promise<Transfer[]> {
    return this.transferRepo.getAll();
  }

  async receiveTransfer(id: string, actor: { id: string; email: string }): Promise<Transfer> {
    return await runTransaction(getUnifiedDb(), async (transaction: any) => {
      const transfer = await this.transferRepo.getById(id, transaction);
      if (!transfer) throw new DomainError('Transfer not found');
      if (transfer.status === 'cancelled') throw new DomainError('Cancelled transfers cannot be received');
      if (transfer.status === 'received') return transfer;

      const result = await this.inventory.applyInventoryDeltas({
        deltas: transfer.items.map((item) => ({
          productId: item.productId,
          delta: item.quantity,
        })),
        idempotencyKey: `transfer-receive:${id}`,
        actor: 'admin',
        reason: 'admin_adjustment',
        transaction,
      });
      if (!result.ok) throw new DomainError(result.message);

      const receivedTransfer: Transfer = {
        ...transfer,
        status: 'received',
        receivedCount: transfer.itemsCount
      };

      await this.transferRepo.update(id, {
        status: 'received',
        receivedCount: transfer.itemsCount
      }, transaction);

      await this.audit.recordWithTransaction(transaction, {
        userId: actor.id,
        userEmail: actor.email,
        action: 'inventory_transfer_received',
        targetId: id,
        details: {
          source: transfer.source,
          itemsCount: transfer.itemsCount,
          productIds: transfer.items.map((item) => item.productId),
        }
      });

      return receivedTransfer;
    });
  }
}

