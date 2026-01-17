import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// --- IMPORTS - INTERFACES
import { Branch } from '../interfaces/branch.interface';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private api = `${environment.API_URL_CLAIM}/api/branches`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.api);
  }

  getById(id: number): Observable<Branch> {
    return this.http.get<Branch>(`${this.api}/${id}`);
  }

  create(branch: Partial<Branch>): Observable<Branch> {
    return this.http.post<Branch>(this.api, branch);
  }

  update(id: number, branch: Partial<Branch>): Observable<Branch> {
    return this.http.put<Branch>(`${this.api}/${id}`, branch);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
