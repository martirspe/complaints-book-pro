import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Componentes
import { ToastContainerComponent } from './toast/toast-container.component';
import { ToastService } from './toast/toast.service';

// Variables de entorno
import { environment } from '../../environments/environment.prod';

// Google Recaptcha V2
import { RecaptchaModule, RecaptchaFormsModule, RECAPTCHA_SETTINGS, RecaptchaSettings } from 'ng-recaptcha';

// Constantes
const RECAPTCHA_V2_KEY = environment.RECAPTCHA_V2_KEY;

@NgModule({
  declarations: [
    ToastContainerComponent
  ],
  imports: [
    CommonModule,
    RecaptchaFormsModule,
    RecaptchaModule
  ],
  exports: [
    RecaptchaFormsModule,
    RecaptchaModule,
    ToastContainerComponent
  ],
  providers: [
    { provide: RECAPTCHA_SETTINGS, useValue: { siteKey: RECAPTCHA_V2_KEY } as RecaptchaSettings },
    ToastService
  ]
})
export class SharedModule { }
