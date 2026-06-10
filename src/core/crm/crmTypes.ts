export type CrmActor = {
  id: string;
  email: string;
  role?: 'admin' | 'owner' | 'system';
};
