import { Injectable, signal } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _apiKey = signal<string | null>(null);

  initAuth(): Promise<void> {
    return new Promise((resolve) => {
      const key = environment.PUBLIC_API_KEY;
      this._apiKey.set(key);
      sessionStorage.setItem('api_key', key);
      resolve();
    });
  }

  getApiKey(): string | null {
    return this._apiKey() || sessionStorage.getItem('api_key');
  }
}
