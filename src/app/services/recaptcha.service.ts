import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class RecaptchaService {
  private readonly siteKey = environment.RECAPTCHA_V3_KEY;
  private isReady = false;
  private scriptLoaded = false;

  constructor() {
    // No cargar aquí - cargar bajo demanda
  }

  // --- Carga el script de reCAPTCHA v3 dinámicamente
  private loadRecaptchaScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Si el script ya está cargado, no hacer nada
      if (this.scriptLoaded && window.grecaptcha) {
        resolve();
        return;
      }

      // Crear el elemento script con render=<siteKey> para v3
      const script = document.createElement('script');
      const src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(this.siteKey)}&hl=es-419`;
      script.src = src;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.scriptLoaded = true;
        this.initRecaptcha();
        resolve();
      };

      script.onerror = () => {
        reject(new Error('No se pudo cargar el script de reCAPTCHA'));
      };

      document.head.appendChild(script);
    });
  }

  // --- Inicializa reCAPTCHA v3 cuando el script está disponible
  private initRecaptcha(): void {
    if (typeof window !== 'undefined' && window.grecaptcha) {
      window.grecaptcha.ready(() => {
        this.isReady = true;
      });
    }
  }

  // --- Ejecuta reCAPTCHA v3 y retorna un token
  async execute(action: string): Promise<string> {

    try {
      // Cargar el script si no está cargado
      await this.loadRecaptchaScript();

      // Esperar a que grecaptcha esté disponible
      if (typeof window === 'undefined' || !window.grecaptcha) {
        throw new Error('reCAPTCHA script no se ha cargado correctamente');
      }

      // Esperar a que reCAPTCHA esté listo
      await this.waitForRecaptcha();

      const token = await window.grecaptcha.execute(this.siteKey, { action });

      if (!token) {
        throw new Error('reCAPTCHA no devolvió un token');
      }

      return token;
    } catch (error) {
      throw error;
    }
  }

  // --- Espera a que reCAPTCHA esté listo
  private waitForRecaptcha(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.grecaptcha) {
        reject(new Error('grecaptcha no está disponible'));
        return;
      }

      window.grecaptcha.ready(() => {
        resolve();
      });
    });
  }
}
