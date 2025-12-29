export interface Tenant {
  tenant: string;
  legal_name: string;
  brand_name: string;
  tax_id: string;
  primary_color: string;
  accent_color: string;
  favicon_url?: string;
  logo_dark_url?: string;
  logo_light_url?: string;
  notifications_email?: string;
}
