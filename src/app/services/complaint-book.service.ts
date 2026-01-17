import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// --- IMPORTS - INTERFACES
import { ComplaintBook } from '../interfaces/complaint-book.interface';
import { TenantService } from './tenant.service';

@Injectable({ providedIn: 'root' })
export class ComplaintBookService {
  private readonly api = `${environment.API_URL_CLAIM}/api/complaint-books`;
  private readonly tenantService = inject(TenantService);

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el primer libro de reclamaciones del tenant (ruta pública)
   * Envía el tenant slug en el header x-tenant
   */
  getActiveComplaintBook(): Observable<ComplaintBook> {
    const tenantSlug = this.tenantService.tenantSlug();
    const headers = new HttpHeaders({
      'x-tenant': tenantSlug || 'default'
    });
    return this.http.get<ComplaintBook>(`${this.api}/public/active`, { headers });
  }

  getAll(branchId?: number): Observable<ComplaintBook[]> {
    let params = new HttpParams();
    if (branchId) params = params.set('branchId', branchId.toString());
    return this.http.get<ComplaintBook[]>(this.api, { params });
  }

  getById(id: number): Observable<ComplaintBook> {
    return this.http.get<ComplaintBook>(`${this.api}/${id}`);
  }

  create(book: Partial<ComplaintBook>): Observable<ComplaintBook> {
    return this.http.post<ComplaintBook>(this.api, book);
  }

  update(id: number, book: Partial<ComplaintBook>): Observable<ComplaintBook> {
    return this.http.put<ComplaintBook>(`${this.api}/${id}`, book);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
