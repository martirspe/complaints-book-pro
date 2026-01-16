import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// --- IMPORTS - INTERFACES
import { DocumentType } from '../interfaces/document-type.interface';
import { Claim } from '../interfaces/claim.interface';
import { ConsumptionType } from '../interfaces/consumption-type.interface';
import { ClaimType } from '../interfaces/claim-type.interface';
import { Persona } from '../interfaces/persona.interface';
import { Currency } from '../interfaces/currency.interface';

@Injectable({ providedIn: 'root' })
export class ClaimsService {

  private readonly api = `${environment.API_URL_CLAIM}/api`;

  constructor(private http: HttpClient) { }

  // --- CUSTOMERS
  createCustomer(tenantSlug: string, customer: Persona): Observable<Persona> {
    return this.http.post<Persona>(`${this.api}/tenants/${tenantSlug}/customers`, customer);
  }

  getCustomer(tenantSlug: string, id: number): Observable<Persona> {
    return this.http.get<Persona>(`${this.api}/tenants/${tenantSlug}/customers/${id}`);
  }

  updateCustomer(tenantSlug: string, id: number, payload: Partial<Persona>): Observable<Persona> {
    return this.http.put<Persona>(`${this.api}/tenants/${tenantSlug}/customers/${id}`, payload);
  }

  deleteCustomer(tenantSlug: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/tenants/${tenantSlug}/customers/${id}`);
  }

  // --- TUTORS
  createTutor(tenantSlug: string, tutor: Persona): Observable<Persona> {
    return this.http.post<Persona>(`${this.api}/tenants/${tenantSlug}/tutors`, tutor);
  }

  getTutor(tenantSlug: string, id: number): Observable<Persona> {
    return this.http.get<Persona>(`${this.api}/tenants/${tenantSlug}/tutors/${id}`);
  }

  updateTutor(tenantSlug: string, id: number, payload: Partial<Persona>): Observable<Persona> {
    return this.http.put<Persona>(`${this.api}/tenants/${tenantSlug}/tutors/${id}`, payload);
  }

  deleteTutor(tenantSlug: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/tenants/${tenantSlug}/tutors/${id}`);
  }

  // --- CLAIMS (TENANT-SCOPED)
  getClaims(tenantSlug: string): Observable<Claim[]> {
    return this.http.get<Claim[]>(
      `${this.api}/tenants/${tenantSlug}/claims`
    );
  }

  getClaim(tenantSlug: string, claimId: number): Observable<Claim> {
    return this.http.get<Claim>(
      `${this.api}/tenants/${tenantSlug}/claims/${claimId}`
    );
  }

  createClaim(tenantSlug: string, payload: FormData): Observable<Claim> {
    return this.http.post<Claim>(
      `${this.api}/integrations/${tenantSlug}/claims`, payload
    );
  }

  /**
   * Public complaint form (no authentication)
   */
  createPublicClaim(tenantSlug: string, payload: FormData): Observable<Claim> {
    return this.http.post<Claim>(
      `${this.api}/public/${tenantSlug}/claims`,
      payload
    );
  }

  /**
   * Public: Get claim by code for tracking
   * Code pattern: REC-YYYY-###### or QUE-YYYY-######
   */
  getPublicClaimByCode(tenantSlug: string, code: string): Observable<any> {
    return this.http.get<any>(
      `${this.api}/public/${tenantSlug}/claims/${encodeURIComponent(code)}`
    );
  }

  updateClaim(tenantSlug: string, claimId: number, payload: Partial<Claim>): Observable<Claim> {
    return this.http.put<Claim>(
      `${this.api}/tenants/${tenantSlug}/claims/${claimId}`, payload
    );
  }

  deleteClaim(tenantSlug: string, claimId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/tenants/${tenantSlug}/claims/${claimId}`
    );
  }

  assignClaim(tenantSlug: string, claimId: number, assigneeId: number): Observable<Claim> {
    return this.http.patch<Claim>(
      `${this.api}/tenants/${tenantSlug}/claims/${claimId}/assign`, { assignee_id: assigneeId }
    );
  }

  resolveClaim(tenantSlug: string, claimId: number, resolutionNotes: string): Observable<Claim> {
    return this.http.patch<Claim>(
      `${this.api}/tenants/${tenantSlug}/claims/${claimId}/resolve`, { resolution_notes: resolutionNotes }
    );
  }

  // --- CATALOGS
  getDocumentTypes(): Observable<DocumentType[]> {
    return this.http.get<DocumentType[]>(`${this.api}/document_types`);
  }

  getConsumptionTypes(): Observable<ConsumptionType[]> {
    return this.http.get<ConsumptionType[]>(`${this.api}/consumption_types`);
  }

  getClaimTypes(): Observable<ClaimType[]> {
    return this.http.get<ClaimType[]>(`${this.api}/claim_types`);
  }

  getCurrencies(): Observable<Currency[]> {
    return this.http.get<Currency[]>(`${this.api}/currencies`);
  }
}
