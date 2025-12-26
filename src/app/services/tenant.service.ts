import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ITenant } from '../interfaces/tenant.interface';

@Injectable({ providedIn: 'root' })
export class TenantService {

  private readonly api = `${environment.API_URL_CLAIM}/api`;
  private readonly cacheKey = 'tenant_cache_v1';

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

      document.title = `${tenant.company_brand} | Libro de Reclamaciones`;
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
      .get<ITenant>(`${this.api}/tenants/${slug}`)
      .subscribe({
        next: tenant => {
          this._tenant.set(tenant);
          this.writeCache(slug, tenant);
        },
        error: err => console.error('[TenantService] Error loading tenant', err)
      });
  }

  private readCache(): { slug: string; tenant: ITenant } | null {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[TenantService] No se pudo leer cache de tenant', err);
      return null;
    }
  }

  private writeCache(slug: string, tenant: ITenant): void {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({ slug, tenant }));
    } catch (err) {
      console.warn('[TenantService] No se pudo guardar cache de tenant', err);
    }
  }
}
