import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ITenant } from '../interfaces/tenant.interface';

@Injectable({ providedIn: 'root' })
export class TenantService {

  private readonly api = `${environment.API_URL_CLAIM}/api`;

  private readonly _tenant = signal<ITenant | null>(null);
  readonly tenant = this._tenant.asReadonly();

  private readonly _tenantSlug = signal<string>('default');
  readonly tenantSlug = computed(() => this._tenantSlug());

  constructor(private http: HttpClient) {

    /* ✅ EFFECT 1: TEMA */
    effect(() => {
      const tenant = this._tenant();
      if (!tenant) return;

      const root = document.documentElement;
      root.style.setProperty('--brand-primary', tenant.primary_color);
      root.style.setProperty('--brand-accent', tenant.accent_color);
    });

    /* ✅ EFFECT 2: TITLE */
    effect(() => {
      const tenant = this._tenant();
      if (!tenant) return;

      document.title = `${tenant.company_brand} | Libro de Reclamaciones`;
    });

    /* ✅ EFFECT 3: FAVICON */
    effect(() => {
      const tenant = this._tenant();
      if (!tenant?.favicon_url) return;

      const head = document.head || document.getElementsByTagName('head')[0];

      // Eliminar cualquier favicon existente
      const icons = head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      icons.forEach(icon => head.removeChild(icon));

      // Crear nuevo favicon
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      // Cache buster para evitar versión vieja
      link.href = `${tenant.favicon_url}?v=${Date.now()}`;
      head.appendChild(link);
    });
  }

  loadTenant(slug: string = 'default'): void {
    if (this._tenant() && this._tenantSlug() === slug) return;

    this._tenantSlug.set(slug);

    this.http
      .get<ITenant>(`${this.api}/tenants/${slug}`)
      .subscribe({
        next: tenant => this._tenant.set(tenant),
        error: err => console.error('[TenantService] Error loading tenant', err)
      });
  }
}
