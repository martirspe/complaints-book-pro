import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IBranding } from '../interfaces/branding.interface';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly baseUrl = environment.API_URL_CLAIM;

  constructor(private http: HttpClient) {}

  getBranding(): Observable<IBranding> {
    const cacheBuster = Date.now().toString();

    return this.http.get<IBranding>(`${this.baseUrl}/branding`, {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      },
      params: { _cb: cacheBuster }
    });
  }

  // Convert hex color (#RRGGBB or #RGB) to "r, g, b" string
  private hexToRgb(hex: string): string | null {
    if (!hex) return null;
    let h = hex.trim().replace('#', '');
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    if (h.length !== 6) return null;
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  applyTheme(branding: IBranding): void {
    const root = document.documentElement;

    // Clear old Bootstrap defaults that may be cached in style attribute
    const varsToRemove = ['--brand-primary', '--brand-accent', '--brand-primary-rgb', '--brand-accent-rgb', '--bs-primary', '--bs-link-color'];
    varsToRemove.forEach(varName => root.style.removeProperty(varName));

    // Apply brand variables with fresh values
    root.style.setProperty('--brand-primary', branding.primaryColor);
    root.style.setProperty('--brand-accent', branding.accentColor);
    const primaryRgb = this.hexToRgb(branding.primaryColor);
    const accentRgb = this.hexToRgb(branding.accentColor);
    if (primaryRgb) root.style.setProperty('--brand-primary-rgb', primaryRgb);
    if (accentRgb) root.style.setProperty('--brand-accent-rgb', accentRgb);
    // Align Bootstrap theme variables to branding
    root.style.setProperty('--bs-primary', branding.primaryColor);
    root.style.setProperty('--bs-link-color', branding.accentColor);
    // Optional: update favicon dynamically if needed
    if (branding.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
  }
}
