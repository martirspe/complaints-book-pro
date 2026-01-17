import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { tap, catchError } from 'rxjs/operators';
import { throwError, BehaviorSubject } from 'rxjs';
import { TenantService } from './tenant.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tenantService = inject(TenantService);

  // --- TOKENS Y ALMACENAMIENTO
  private readonly ACCESS_TOKEN_KEY = 'reclamofacil_access_token';
  private readonly REFRESH_TOKEN_KEY = 'reclamofacil_refresh_token';
  private readonly USER_KEY = 'reclamofacil_user';

  // --- SEÑALES REACTIVAS
  private authToken = signal<string | null>(this.getStoredAccessToken());
  private refreshToken = signal<string | null>(this.getStoredRefreshToken());
  private currentUser = signal<AuthResponse['user'] | null>(this.getStoredUser());
  private isLoading = signal<boolean>(false);
  private isRefreshing = signal<boolean>(false);

  // --- COMPUTED
  isAuthenticated = computed(() => !!this.authToken());
  getToken = computed(() => this.authToken());
  getRefreshToken = computed(() => this.refreshToken());
  getCurrentUser = computed(() => this.currentUser());

  // --- OBSERVABLE PARA CAMBIOS DE ESTADO
  private authStateSubject = new BehaviorSubject<boolean>(this.isAuthenticated());
  authState$ = this.authStateSubject.asObservable();

  constructor() {
    this.initializeAuth();
  }

  /**
   * Inicializa el estado de autenticación desde localStorage
   */
  private initializeAuth(): void {
    const token = this.getStoredAccessToken();
    const refreshToken = this.getStoredRefreshToken();
    const user = this.getStoredUser();

    if (token) {
      this.authToken.set(token);
    }
    if (refreshToken) {
      this.refreshToken.set(refreshToken);
    }
    if (user) {
      this.currentUser.set(user);
    }
  }

  /**
   * Login del usuario
   */
  login(credentials: LoginRequest) {
    this.isLoading.set(true);
    return this.http.post<AuthResponse>(`${environment.API_URL_CLAIM}/api/public/login`, credentials)
      .pipe(
        tap((response) => {
          this.setAccessToken(response.access_token);
          this.setRefreshToken(response.refresh_token);
          this.setUser(response.user);
          this.authStateSubject.next(true);
          this.isLoading.set(false);
        }),
        catchError((error) => {
          this.isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  /**
   * Refresca el access token usando el refresh token
   */
  refreshAccessTokenSilently() {
    const refreshToken = this.getStoredRefreshToken();
    if (!refreshToken || this.isRefreshing()) {
      return throwError(() => new Error('No refresh token available'));
    }

    this.isRefreshing.set(true);
    const tenantSlug = this.tenantService.tenantSlug();
    const headers = new HttpHeaders({
      'x-tenant': tenantSlug || 'default'
    });

    return this.http.post<AuthResponse>(
      `${environment.API_URL_CLAIM}/api/public/refresh`,
      { refresh_token: refreshToken },
      { headers }
    ).pipe(
      tap((response) => {
        this.setAccessToken(response.access_token);
        this.setRefreshToken(response.refresh_token);
        if (response.user) {
          this.setUser(response.user);
        }
        this.isRefreshing.set(false);
      }),
      catchError((error) => {
        this.isRefreshing.set(false);
        // Si falla el refresh, limpiar autenticación
        this.clearAuth();
        this.authStateSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout del usuario
   */
  logout(): void {
    this.clearAuth();
    this.authStateSubject.next(false);
    this.router.navigate(['/login']);
  }

  /**
   * Guarda el access token
   */
  private setAccessToken(token: string): void {
    this.authToken.set(token);
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  /**
   * Guarda el refresh token
   */
  private setRefreshToken(token: string): void {
    this.refreshToken.set(token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  /**
   * Guarda los datos del usuario
   */
  private setUser(user: AuthResponse['user']): void {
    this.currentUser.set(user);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Obtiene el access token del localStorage
   */
  private getStoredAccessToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Obtiene el refresh token del localStorage
   */
  private getStoredRefreshToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Obtiene el usuario del localStorage
   */
  private getStoredUser(): AuthResponse['user'] | null {
    if (typeof localStorage === 'undefined') return null;
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Limpia toda la información de autenticación
   */
  private clearAuth(): void {
    this.authToken.set(null);
    this.refreshToken.set(null);
    this.currentUser.set(null);
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole(role: string): boolean {
    return this.currentUser()?.role === role;
  }

  /**
   * Verifica si el token está próximo a expirar (dentro de 5 minutos)
   */
  isTokenExpiringSoon(): boolean {
    const token = this.authToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const now = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;

      return expiryTime - now < fiveMinutesInMs;
    } catch {
      return true;
    }
  }
}
