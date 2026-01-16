import { Persona } from './persona.interface';
import { ConsumptionType } from './consumption-type.interface';
import { ClaimType } from './claim-type.interface';
import { Currency } from './currency.interface';

export interface Claim {
  id: number;
  code: string;
  customer_id: number;
  tutor_id: number;
  consumption_type_id: number;
  claim_type_id: number;
  currency_id: number;
  order_number: number;
  claimed_amount: number;
  description: string;
  detail: string;
  request: string;
  attachment: string | null;
  terms_accepted: boolean;
  assigned_user: number | null;
  response: string | null;
  response_attachment: string | null;
  resolved: boolean;
  status: number;
  creation_date: string;
  assignment_date: string | null;
  response_date: string | null;
  update_date: string;
  Customer: Persona;
  Tutor: Persona;
  ConsumptionType: ConsumptionType;
  ClaimType: ClaimType;
  Currency: Currency;
}
