export interface Branch {
  id: number;
  name: string;
  address: string;
  phone?: string;
  isActive: boolean;
  tenantId: number;
}
