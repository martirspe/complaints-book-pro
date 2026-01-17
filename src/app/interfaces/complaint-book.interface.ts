export interface ComplaintBook {
  id: number;
  code: string;
  description?: string;
  isActive: boolean;
  tenantId: number;
  branchId: number;
}
