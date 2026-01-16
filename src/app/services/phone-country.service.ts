import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PhoneCountry } from '../interfaces/phone-country.interface';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PhoneCountryService {
  private readonly api = `${environment.API_URL_CLAIM}/api/phone-countries`;

  public phoneCountries = signal<PhoneCountry[]>([]);

  constructor(private http: HttpClient) { }

  fetchPhoneCountries(): Observable<PhoneCountry[]> {
    return this.http.get<PhoneCountry[]>(this.api);
  }
}
