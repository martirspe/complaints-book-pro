export interface ICustomer {
  id?: number;
  document_type_id: number;
  document_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  is_younger: boolean;
}
