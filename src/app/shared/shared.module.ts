import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Componentes
import { NavbarComponent } from './navbar/navbar.component';

// Variables de entorno
import { environment } from '../../environments/environment';

// Google Recaptcha V2
import { RecaptchaModule, RecaptchaFormsModule, RECAPTCHA_SETTINGS, RecaptchaSettings } from 'ng-recaptcha';

// Constantes
const RECAPTCHA_V2_KEY = environment.RECAPTCHA_V2_KEY;

@NgModule({
  declarations: [
    NavbarComponent
  ],
  imports: [
    CommonModule,
    RecaptchaFormsModule,
    RecaptchaModule
  ],
  exports: [
    NavbarComponent,
    RecaptchaFormsModule,
    RecaptchaModule
  ],
  providers: [
    { provide: RECAPTCHA_SETTINGS, useValue: { siteKey: RECAPTCHA_V2_KEY } as RecaptchaSettings }
  ]
})
export class SharedModule { }
