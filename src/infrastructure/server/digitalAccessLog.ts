import { FirestoreDigitalAccessRepository } from '@infrastructure/repositories/firestore/FirestoreDigitalAccessRepository';

type DigitalAccessRecord = {
  id: string;
  userId: string;
  assetId: string;
  ipAddress: string;
  userAgent: string;
};

let repository: FirestoreDigitalAccessRepository | null = null;

function getRepository(): FirestoreDigitalAccessRepository {
  if (!repository) repository = new FirestoreDigitalAccessRepository();
  return repository;
}

export async function recordDigitalAssetAccess(record: DigitalAccessRecord): Promise<void> {
  await getRepository().record(record);
}
