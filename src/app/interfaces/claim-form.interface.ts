import { FormControl } from '@angular/forms';

export interface ClaimForm {
  // Datos personales del cliente
  document_type_id: FormControl<string>;
  document_number: FormControl<string>;
  first_name: FormControl<string>;
  last_name: FormControl<string>;
  celphone: FormControl<string>;
  email: FormControl<string>;
  address: FormControl<string>;
  is_younger: FormControl<boolean>;
  // Datos del tutor (si es menor)
  document_type_tutor_id: FormControl<string>;
  document_number_tutor: FormControl<string>;
  first_name_tutor: FormControl<string>;
  last_name_tutor: FormControl<string>;
  celphone_tutor: FormControl<string>;
  email_tutor: FormControl<string>;
  // Información del consumo
  claim_type_id: FormControl<string>;
  order_number: FormControl<string>;
  claimed_amount: FormControl<string>;
  currency_id: FormControl<string>;
  description: FormControl<string>;
  consumption_type_id: FormControl<string>;
  // Detalles del reclamo
  detail: FormControl<string>;
  request: FormControl<string>;
  // Archivos y seguridad
  attachment: FormControl<File | null>;
  recaptcha: FormControl<string>;
}
