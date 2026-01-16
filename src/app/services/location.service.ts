import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Location {
  id: number;
  ubigeo: string;
  district: string;
  province: string;
  department: string;
  displayName: string;
  active: boolean;
}

export interface Department {
  name: string;
  count: number;
}

export interface Province {
  name: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private readonly http = inject(HttpClient);
  // Backend routes are mounted under /api in locationRoutes
  private readonly api = `${environment.API_URL_CLAIM}/api/locations`;

  /**
   * Obtiene todas las ubicaciones activas
   */
  getLocations(params?: { department?: string; province?: string; search?: string }): Observable<Location[]> {
    let url = this.api;
    const queryParams = new URLSearchParams();

    if (params?.department) queryParams.append('department', params.department);
    if (params?.province) queryParams.append('province', params.province);
    if (params?.search) queryParams.append('search', params.search);

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    return this.http.get<Location[]>(url);
  }

  /**
   * Obtiene la lista de departamentos únicos
   */
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.api}/departments`);
  }

  /**
   * Obtiene las provincias de un departamento específico
   */
  getProvincesByDepartment(department: string): Observable<Province[]> {
    return this.http.get<Province[]>(`${this.api}/departments/${encodeURIComponent(department)}/provinces`);
  }

  /**
   * Obtiene los distritos de una provincia específica
   */
  getDistrictsByProvince(department: string, province: string): Observable<Location[]> {
    return this.http.get<Location[]>(
      `${this.api}/departments/${encodeURIComponent(department)}/provinces/${encodeURIComponent(province)}/districts`
    );
  }

  /**
   * Busca una ubicación por su ID
   */
  getLocationById(id: number): Observable<Location> {
    return this.http.get<Location>(`${this.api}/${id}`);
  }

  /**
   * Busca una ubicación por código UBIGEO
   */
  getLocationByUbigeo(ubigeo: string): Observable<Location> {
    return this.http.get<Location>(`${this.api}/ubigeo/${ubigeo}`);
  }
}
