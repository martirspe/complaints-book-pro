import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

// --- IMPORTS - INTERFACES
import { DocumentType } from '../interfaces/document-type.interface';
import { Claim } from '../interfaces/claim.interface';
import { ConsumptionType } from '../interfaces/consumption-type.interface';
import { ClaimType } from '../interfaces/claim-type.interface';
import { Customer } from '../interfaces/customer.interface';
import { Tutor } from '../interfaces/tutor.interface';
import { Currency } from '../interfaces/currency.interface';
import { CreateClaimPayload } from '../interfaces/create-claim.interface';

@Injectable({ providedIn: 'root' })
export class ClaimsService {

  private readonly api = `${environment.API_URL_CLAIM}/api`;

  constructor(private http: HttpClient) { }

  // --- CUSTOMERS
  createCustomer(tenantSlug: string, customer: Customer): Observable<Customer> {
    return this.http.post<Customer>(`${this.api}/tenants/${tenantSlug}/customers`, customer);
  }

  getCustomerByDocument(tenantSlug: string, documentNumber: string): Observable<Customer> {
    return this.http.get<Customer>(
      `${this.api}/tenants/${tenantSlug}/customers/document/${documentNumber}`
    );
  }

  getCustomer(tenantSlug: string, id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.api}/tenants/${tenantSlug}/customers/${id}`);
  }

  updateCustomer(tenantSlug: string, id: number, payload: Partial<Customer>): Observable<Customer> {
    return this.http.put<Customer>(`${this.api}/tenants/${tenantSlug}/customers/${id}`, payload);
  }

  deleteCustomer(tenantSlug: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/tenants/${tenantSlug}/customers/${id}`);
  }

  // --- TUTORS
  createTutor(tenantSlug: string, tutor: Tutor): Observable<Tutor> {
    return this.http.post<Tutor>(`${this.api}/tenants/${tenantSlug}/tutors`, tutor);
  }

  getTutorByDocument(tenantSlug: string, documentNumber: string): Observable<Tutor> {
    return this.http.get<Tutor>(
      `${this.api}/tenants/${tenantSlug}/tutors/document/${documentNumber}`
    );
  }

  getTutor(tenantSlug: string, id: number): Observable<Tutor> {
    return this.http.get<Tutor>(`${this.api}/tenants/${tenantSlug}/tutors/${id}`);
  }

  updateTutor(tenantSlug: string, id: number, payload: Partial<Tutor>): Observable<Tutor> {
    return this.http.put<Tutor>(`${this.api}/tenants/${tenantSlug}/tutors/${id}`, payload);
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

  createClaim(tenantSlug: string, payload: CreateClaimPayload | FormData): Observable<Claim> {
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
