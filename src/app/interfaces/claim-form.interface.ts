export interface IClaimForm {
  document_type_id: number;
  document_number: string;
  first_name: string;
  last_name: string;
  celphone: string;
  email: string;
  address: string;
  adult: boolean;
  document_type_tutor_id: number;
  document_number_tutor: string;
  first_name_tutor: string;
  last_name_tutor: string;
  celphone_tutor: string;
  email_tutor: string;
  claim_type_id: number;
  claimed_amount: number;
  description: string;
  consumption_type_id: number;
  detail: string;
  request: string;
  attachment: string;
  terms: boolean;
  recaptcha: string;
}
