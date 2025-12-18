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
    return this.http.get<IBranding>(`${this.baseUrl}/branding`);
  }

  applyTheme(branding: IBranding): void {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', branding.primaryColor);
    root.style.setProperty('--brand-accent', branding.accentColor);
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
