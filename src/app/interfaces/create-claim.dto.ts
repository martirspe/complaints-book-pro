export interface ICreateClaimPayload {
  customer_id: number;
  tutor_id?: number;
  claim_type_id: number;
  consumption_type_id: number;
  currency_id: number;
  order_number: number;
  claimed_amount: number;
  description: string;
  detail: string;
  request: string;
  recaptcha?: string;
}
