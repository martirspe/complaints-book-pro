import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// Interfaces
import { IDocumentType } from '../interfaces/document-type.interface';
import { IClaim } from '../interfaces/claim.interface';
import { IConsumptionType } from '../interfaces/consumption-type.interface';
import { IClaimType } from '../interfaces/claim-type.interface';
import { ICustomer } from '../interfaces/customer.interface';
import { ITutor } from '../interfaces/tutor.interface';
import { ICurrency } from '../interfaces/currency.interface';
import { ICreateClaimPayload } from '../interfaces/create-claim.dto';

@Injectable({ providedIn: 'root' })
export class ClaimsService {

  private readonly api = `${environment.API_URL_CLAIM}/api`;

  constructor(private http: HttpClient) { }

  /* ======================================================
   * CUSTOMERS
   * ====================================================== */

  createCustomer(customer: ICustomer): Observable<ICustomer> {
    return this.http.post<ICustomer>(`${this.api}/customers`, customer);
  }

  getCustomerByDocument(documentNumber: string): Observable<ICustomer> {
    return this.http.get<ICustomer>(
      `${this.api}/customers/document/${documentNumber}`
    );
  }

  getCustomer(id: number): Observable<ICustomer> {
    return this.http.get<ICustomer>(`${this.api}/customers/${id}`);
  }

  updateCustomer(id: number, payload: Partial<ICustomer>): Observable<ICustomer> {
    return this.http.put<ICustomer>(`${this.api}/customers/${id}`, payload);
  }

  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/customers/${id}`);
  }

  /* ======================================================
   * TUTORS
   * ====================================================== */

  createTutor(tutor: ITutor): Observable<ITutor> {
    return this.http.post<ITutor>(`${this.api}/tutors`, tutor);
  }

  getTutorByDocument(documentNumber: string): Observable<ITutor> {
    return this.http.get<ITutor>(
      `${this.api}/tutors/document/${documentNumber}`
    );
  }

  getTutor(id: number): Observable<ITutor> {
    return this.http.get<ITutor>(`${this.api}/tutors/${id}`);
  }

  updateTutor(id: number, payload: Partial<ITutor>): Observable<ITutor> {
    return this.http.put<ITutor>(`${this.api}/tutors/${id}`, payload);
  }

  deleteTutor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/tutors/${id}`);
  }

  /* ======================================================
   * CLAIMS (TENANT-SCOPED)
   * ====================================================== */

  getClaims(tenantSlug: string): Observable<IClaim[]> {
    return this.http.get<IClaim[]>(
      `${this.api}/tenants/${tenantSlug}/claims`
    );
  }

  getClaim(tenantSlug: string, claimId: number): Observable<IClaim> {
    return this.http.get<IClaim>(
      `${this.api}/tenants/${tenantSlug}/claims/${claimId}`
    );
  }

  createClaim(tenantSlug: string, payload: ICreateClaimPayload | FormData): Observable<IClaim> {
    return this.http.post<IClaim>(
      `${this.api}/integrations/${tenantSlug}/claims`, payload
    );
  }

  updateClaim(tenantSlug: string, claimId: number, payload: Partial<IClaim>): Observable<IClaim> {
    return this.http.put<IClaim>(
      `${this.api}/tenants/${tenantSlug}/claims/${claimId}`, payload
    );
  }

  deleteClaim(tenantSlug: string, claimId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/tenants/${tenantSlug}/claims/${claimId}`
    );
  }

  assignClaim(
    tenantSlug: string,
    claimId: number,
    assigneeId: number
  ): Observable<IClaim> {
    return this.http.patch<IClaim>(
      `${this.api}/tenants/${tenantSlug}/claims/${claimId}/assign`,
      { assignee_id: assigneeId }
    );
  }

  resolveClaim(
    tenantSlug: string,
    claimId: number,
    resolutionNotes: string
  ): Observable<IClaim> {
    return this.http.patch<IClaim>(
      `${this.api}/tenants/${tenantSlug}/claims/${claimId}/resolve`,
      { resolution_notes: resolutionNotes }
    );
  }

  /* ======================================================
   * CATALOGS
   * ====================================================== */

  getDocumentTypes(): Observable<IDocumentType[]> {
    return this.http.get<IDocumentType[]>(`${this.api}/document_types`);
  }

  getConsumptionTypes(): Observable<IConsumptionType[]> {
    return this.http.get<IConsumptionType[]>(`${this.api}/consumption_types`);
  }

  getClaimTypes(): Observable<IClaimType[]> {
    return this.http.get<IClaimType[]>(`${this.api}/claim_types`);
  }

  getCurrencies(): Observable<ICurrency[]> {
    return this.http.get<ICurrency[]>(`${this.api}/currencies`);
  }
}
