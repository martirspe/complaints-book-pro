import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

// --- IMPORTS - SERVICES
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);

  let headers = req.headers;

  const apiKey = authService.getApiKey();

  if (apiKey) {
    headers = headers.set('x-api-key', apiKey);
  }

  return next(req.clone({ headers }));
};
