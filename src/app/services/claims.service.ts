import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// Interfaces
import { IDocumentType } from '../interfaces/document-type.interface';
import { IClaimForm } from '../interfaces/claim-form.interface';
import { IClaim } from '../interfaces/claim.interface';
import { IConsumptionType } from '../interfaces/consumption-type.interface';
import { IClaimType } from '../interfaces/claim-type.interface';
import { ICustomer } from '../interfaces/customer.interface';
import { ITutor } from '../interfaces/tutor.interface';

@Injectable({
  providedIn: 'root'
})
export class ClaimsService {

  private apiUrl = environment.API_URL_CLAIM;

  constructor(private http: HttpClient) { }

  // Método para crear un cliente
  createCustomer(customer: ICustomer): Observable<ICustomer> {
    return this.http.post<ICustomer>(`${this.apiUrl}/customers`, customer);
  }

  // Método para crear un tutor
  createTutor(tutor: ITutor): Observable<ITutor> {
    return this.http.post<ITutor>(`${this.apiUrl}/tutors`, tutor);
  }

  // Método para crear un reclamo
  createClaim(formData: IClaimForm | FormData): Observable<IClaimForm> {
    return this.http.post<IClaimForm>(`${this.apiUrl}/claims`, formData);
  }

  // Método para obtener un reclamo por ID
  getClaim(id: number): Observable<IClaim> {
    return this.http.get<IClaim>(`${this.apiUrl}/claims/${id}`);
  }

  // Método para obtener los tipos de documentos
  getDocumentTypes(): Observable<IDocumentType[]> {
    return this.http.get<IDocumentType[]>(`${this.apiUrl}/document_types`);
  }

  // Método para obtener los tipos de consumo
  getConsumptionTypes(): Observable<IConsumptionType[]> {
    return this.http.get<IConsumptionType[]>(`${this.apiUrl}/consumption_types`);
  }

  // Método para obtener los tipos de reclamo
  getClaimTypes(): Observable<IClaimType[]> {
    return this.http.get<IClaimType[]>(`${this.apiUrl}/claim_types`);
  }

}
