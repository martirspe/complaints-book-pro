import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, take } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Interceptor HTTP que:
 * 1. Añade el JWT token a todas las peticiones
 * 2. Detecta tokens expirados (401)
 * 3. Intenta refrescar el token automáticamente
 * 4. Reintenta la solicitud con el nuevo token
 * Sigue el patrón funcional de Angular 21
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const token = authService.getToken();

  // Si hay token, añadirlo al header Authorization
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si es 401 (Unauthorized), intentar refresh del token
      if (error.status === 401 && token && req.url.includes('api/')) {
        // No intentar refresh para endpoints de login/refresh para evitar loops
        if (req.url.includes('/public/login') || req.url.includes('/public/refresh') || req.url.includes('/public/signup')) {
          return throwError(() => error);
        }

        // Intentar refrescar el token
        return authService.refreshAccessTokenSilently().pipe(
          take(1),
          switchMap(() => {
            // Obtener el nuevo token y reintentar la solicitud
            const newToken = authService.getToken();
            if (newToken) {
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(retryReq);
            }
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            // Si falla el refresh, redirigir a login
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
