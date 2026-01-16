export interface Tenant {
  tenant: string;
  legal_name: string;
  brand_name: string;
  tax_id: string;
  contact_phone: string;
  address: string;
  country: string;
  industry: string;
  website: string;
  primary_color: string | null;
  accent_color: string | null;
  logo_light_url: string;
  logo_dark_url: string;
  favicon_url: string;
  contact_email: string;
  terms_url: string | null;
  privacy_url: string | null;
}
