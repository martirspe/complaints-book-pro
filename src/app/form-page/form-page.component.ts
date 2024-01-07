import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-form-page',
  templateUrl: './form-page.component.html',
  styleUrls: ['./form-page.component.css']
})
export class FormPageComponent {

  // Variables
  progressWidth: number = 0;
  currentStep: number = 1;
  totalSteps: number = 3;
  isAdult: boolean = false;
  cType: boolean = false;
  sSend: boolean = false;
  eSend: boolean = false;
  lrq: string = 'a';
  tReclamo: string = '';
  tConsumo: string = '';

  // Enlaces para los términos y condiciones, políticas de privacidad
  terms: string = '#';
  policy: string = '#';

  constructor(private fb: FormBuilder) {
    // Inicializar progress-bar
    this.progressWidth = (1 / this.totalSteps) * 100;
  }

  // Progress-bar
  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.progressWidth = (this.currentStep / this.totalSteps) * 100;
      this.updateStepsVisibility();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.progressWidth = (this.currentStep / this.totalSteps) * 100;
      this.updateStepsVisibility();
    }
  }

  private updateStepsVisibility() {
    const steps = document.querySelectorAll('.form-steps');

    steps.forEach((step, index) => {
      if (index + 1 === this.currentStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
  }

  public myForm: FormGroup = this.fb.group({
    d_type: [1, [Validators.required]],
    d_number: ['70555248', [Validators.required, Validators.minLength(8), Validators.maxLength(8), Validators.pattern('[0-9]+')]],
    name: ['Noé Martín', [Validators.required, Validators.pattern('^[a-zA-ZÀ-ÿ\u00f1\u00d1]+(\s*[a-zA-ZÀ-ÿ\u00f1\u00d1 ]*)*[a-zA-ZÀ-ÿ\u00f1\u00d1]+$')]],
    lastname: ['Rojas Soplín', [Validators.required, Validators.pattern('^[a-zA-ZÀ-ÿ\u00f1\u00d1]+(\s*[a-zA-ZÀ-ÿ\u00f1\u00d1 ]*)*[a-zA-ZÀ-ÿ\u00f1\u00d1]+$')]],
    celphone: ['938360044', [Validators.required, Validators.minLength(9), Validators.maxLength(9), Validators.pattern('[0-9]+')]],
    email: ['rosonoem@gmail.com', [Validators.required, Validators.email, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]],
    address: ['Av. Marginal 145, Salamanca, Ate', [Validators.required, Validators.minLength(25)]],
    adult: [this.isAdult],
    d_type_tutor: [1, [Validators.required]],
    d_number_tutor: ['00821058', [Validators.required, Validators.minLength(8), Validators.maxLength(8), Validators.pattern('[0-9]+')]],
    name_tutor: ['Filonila Mayela', [Validators.required, Validators.pattern('^[a-zA-ZÀ-ÿ\u00f1\u00d1]+(\s*[a-zA-ZÀ-ÿ\u00f1\u00d1 ]*)*[a-zA-ZÀ-ÿ\u00f1\u00d1]+$')]],
    lastname_tutor: ['Soplín Valdivia', [Validators.required, Validators.pattern('^[a-zA-ZÀ-ÿ\u00f1\u00d1]+(\s*[a-zA-ZÀ-ÿ\u00f1\u00d1 ]*)*[a-zA-ZÀ-ÿ\u00f1\u00d1]+$')]],
    celphone_tutor: ['972873101', [Validators.required, Validators.minLength(9), Validators.maxLength(9), Validators.pattern('[0-9]+')]],
    email_tutor: ['fimasova@gmail.com', [Validators.required, Validators.email, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]],
    c_type: [1, [Validators.required]],
    r_amount: ['100', [Validators.required]],
    description: ['It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.', [Validators.required, Validators.minLength(100)]],
    t_consumption: [1, [Validators.required]],
    details: ['It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.', [Validators.required, Validators.minLength(50)]],
    request: ['It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.', [Validators.required, Validators.minLength(100)]],
    file: [''],
    terms: ['', Validators.requiredTrue],
    recaptcha: ['', [Validators.required]]
  });

  isYounger(value: boolean): void {
    this.isAdult = value;
    // console.log(this.menor);
  }

  claimType(): void {
    this.cType = !this.cType;
    // console.log(this.cType);
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors
      && this.myForm.controls[field].touched;
  }
  getFieldError(field: string): string | null {
    if (!this.myForm.controls[field]) return null;
    const errors = this.myForm.controls[field].errors || {};

    for (const key of Object.keys(errors)) {
      switch (key) {
        case 'required':
          return 'Este campo es obligatorio.'
        case 'minlength':
          return `Se requiere ${errors['minlength'].requiredLength} carácteres como mínimo.`
        case 'maxlength':
          return `Se requiere ${errors['maxlength'].requiredLength} carácteres como máximo.`
        case 'pattern':
          return 'Este campo contiene carácteres no permitidos.'
        case 'email':
          return 'No cumple con la estructura de un correo válido.'
      }
      // console.log(key);
    }
    return 'Fuera de validación'
  }

  onSave(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    // Ocultar mensaje de envío
    setTimeout(() => {
      this.sSend = false;
    }, 3500);

    // Restablecer el formulario y volver al primer paso
    this.myForm.reset({ d_type: '1', d_type_tutor: 1, t_consumption: 1, c_type: 1 });
    this.sSend = true;
    this.currentStep = 1;
    this.progressWidth = (1 / this.totalSteps) * 100;
    this.updateStepsVisibility();
  }

  // Google Recaptcha V2
  public log: string[] = [];

  public addTokenLog(message: string, token: string | null) {
    this.log.push(`${message}: ${this.formatToken(token)}`);
  }

  public formatToken(token: string | null) {
    return token !== null
      ? `${token.substr(0, 7)}...${token.substr(-7)}`
      : 'null';
  }

}
