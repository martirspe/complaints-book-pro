import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Tenant } from '../interfaces/tenant.interface';

@Injectable({ providedIn: 'root' })
export class TenantService {

  private readonly api = `${environment.API_URL_CLAIM}/api`;
  private readonly cacheKey = 'tenant_cache_v1';

  private readonly _tenant = signal<Tenant | null>(null);
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

    /* ✅ EFFECT 2: THEME-COLOR (barra del navegador) */
    effect(() => {
      const tenant = this._tenant();
      if (!tenant?.primary_color) return;

      const head = document.head || document.getElementsByTagName('head')[0];
      let themeMeta = head.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;

      if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.name = 'theme-color';
        head.appendChild(themeMeta);
      }

      themeMeta.content = tenant.primary_color;
    });

    /* ✅ EFFECT 3: TITLE */
    effect(() => {
      const tenant = this._tenant();
      if (!tenant) return;

      document.title = `${tenant.brand_name || tenant.legal_name} | Libro de Reclamaciones`;
    });

    /* ✅ EFFECT 4: FAVICON */
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
    this._tenantSlug.set(slug);

    // 🟢 1) Servir desde cache local para evitar parpadeo
    const cached = this.readCache();
    if (cached && cached.slug === slug) {
      this._tenant.set(cached.tenant);
    }

    // 🟠 2) Refrescar siempre desde API para mantener datos al día
    this.http
      .get<Tenant>(`${this.api}/tenants/${slug}`)
      .subscribe({
        next: tenant => {
          this._tenant.set(tenant);
          this.writeCache(slug, tenant);
        },
        error: () => { }
      });
  }

  /**
   * Alias para loadTenant que recibe el slug del tenant desde la URL
   */
  loadTenantBySlug(slug: string): void {
    this.loadTenant(slug);
  }

  /**
   * Automatically detect tenant slug from subdomain
   * Examples:
   * - empresa1.reclamofacil.com -> returns "empresa1"
   * - localhost:4200 -> returns "default"
   * - reclamofacil.com -> returns "default"
   * - default.reclamofacil.com -> returns "default" (pero isMainDomain=false)
   */
  detectTenantFromSubdomain(): string {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');

    // localhost or IP address -> use default
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return 'default';
    }

    // Less than 3 parts (e.g., reclamofacil.com) -> use default (main domain)
    if (parts.length < 3) {
      return 'default';
    }

    // Extract subdomain (first part)
    const subdomain = parts[0].toLowerCase();

    // www or api subdomains -> use default (main domain)
    if (subdomain === 'www' || subdomain === 'api') {
      return 'default';
    }

    return subdomain;
  }

  /**
   * Detecta si el acceso es desde el dominio principal (sin subdomain específico de tenant)
   */
  isMainDomain(): boolean {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');

    // localhost sin subdomain -> main
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return true;
    }

    // Less than 3 parts (reclamofacil.com) -> main
    if (parts.length < 3) {
      return true;
    }

    // www or api subdomains -> main
    const subdomain = parts[0].toLowerCase();
    return subdomain === 'www' || subdomain === 'api';
  }

  private readCache(): { slug: string; tenant: Tenant } | null {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      // silent
      return null;
    }
  }

  private writeCache(slug: string, tenant: Tenant): void {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({ slug, tenant }));
    } catch (err) {
      // silent
    }
  }
}
