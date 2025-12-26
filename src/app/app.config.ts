import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { RECAPTCHA_V3_SITE_KEY } from 'ng-recaptcha';

// Routes
import { routes } from './app.routes';

// Environments
import { environment } from '../environments/environment';

// Services
import { TenantService } from './services/tenant.service';
import { AuthService } from './services/auth.service';

// Interceptor (functional)
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideAnimations(),

    // 🔑 INIT GLOBAL CORRECTO
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AuthService, TenantService],
      useFactory: (auth: AuthService, tenant: TenantService) => {
        return async () => {
          // ⬅️ 1. AUTH PRIMERO
          await auth.initAuth();

          // ⬅️ 2. LUEGO TENANT (ya con API KEY)
          tenant.loadTenant('default');
        };
      }
    },

    {
      provide: RECAPTCHA_V3_SITE_KEY,
      useValue: environment.RECAPTCHA_V3_KEY
    }
  ]
};
