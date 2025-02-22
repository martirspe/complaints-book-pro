import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, switchMap } from 'rxjs';

// Services
import { ClaimsService } from '../services/claims.service';

// Interfaces
import { IClaimType } from '../interfaces/claim-type.interface';
import { IDocumentType } from '../interfaces/document-type.interface';
import { IConsumptionType } from '../interfaces/consumption-type.interface';
import { ICustomer } from '../interfaces/customer.interface';
import { ITutor } from '../interfaces/tutor.interface';

@Component({
  selector: 'app-form-page',
  templateUrl: './form-page.component.html',
  styleUrls: ['./form-page.component.css']
})
export class FormPageComponent implements OnInit {

  // Datos de la empresa
  readonly companyBrand = 'MARRSO';
  readonly companyName = 'MARRSO S.A.C';
  readonly companyRuc = '20613518895';

  // Variables para el formulario
  private readonly MIN_DESC_LENGTH = 100;
  private readonly MIN_DETAIL_LENGTH = 50;
  private readonly DOC_LENGTH = 8;
  private readonly PHONE_LENGTH = 9;
  private readonly MIN_ADDRESS_LENGTH = 25;
  public flag = false;

  // Descripción de los tipos de reclamo
  public sDescription = '';

  // Variable para almacenar el nombre de archivo
  public selectedFileName: string | null = null;

  // Variables progress bar
  readonly totalSteps = 3;
  public currentStep = 1;
  public progressWidth = (1 / this.totalSteps) * 100;

  // Obtener el año actual
  currentYear = new Date().getFullYear();

  // Arreglo de tipos de documentos
  documentTypes: IDocumentType[] = [];

  // Arreglo de tipos de consumo
  consumptionTypes: IConsumptionType[] = [];

  // Arreglo de tipos de reclamo
  claimTypes: IClaimType[] = [];

  // Variables boleanas
  isYouger = false;
  sSend = false;
  eSend = false;

  // Patterns
  private readonly namePattern = '^[a-zA-ZÀ-ÿ\u00f1\u00d1]+(\s*[a-zA-ZÀ-ÿ\u00f1\u00d1 ]*)*[a-zA-ZÀ-ÿ\u00f1\u00d1]+$';
  private readonly emailPattern = '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$';

  constructor(
    private fb: FormBuilder,
    private claimsService: ClaimsService
  ) {
    setInterval(() => {
      this.flag = !this.flag;
    }, 60000);
  }

  ngOnInit(): void {
    this.loadDocumentTypes();
    this.loadConsumptionTypes();
    this.loadClaimTypes();
    this.setupYoungerValidation();
  }

  setupYoungerValidation(): void {
    this.claimForm.get('is_youger')?.valueChanges.subscribe((isYounger: boolean) => {
      const tutorFields = [
        'document_type_tutor_id',
        'document_number_tutor',
        'first_name_tutor',
        'last_name_tutor',
        'celphone_tutor',
        'email_tutor'
      ];

      tutorFields.forEach(field => {
        const control = this.claimForm.get(field);
        if (control) {
          if (isYounger) {
            control.setValidators([Validators.required]);
          } else {
            control.clearValidators();
            control.reset(); // Resetea el campo y limpia su estado
          }
          control.updateValueAndValidity();
        }
      });

      // Forzar la actualización del formulario
      this.claimForm.markAsPristine(); // Lo marca como sin cambios
      this.claimForm.markAsUntouched(); // Lo marca como sin tocar
      this.claimForm.updateValueAndValidity();
    });
  }


  public claimForm: FormGroup = this.fb.group({
    document_type_id: ['', Validators.required],
    document_number: ['', [
      Validators.required,
      Validators.minLength(this.DOC_LENGTH),
      Validators.maxLength(this.DOC_LENGTH),
      Validators.pattern('[0-9]+')
    ]],
    first_name: ['', [Validators.required, Validators.pattern(this.namePattern)]],
    last_name: ['', [Validators.required, Validators.pattern(this.namePattern)]],
    celphone: ['', [
      Validators.required,
      Validators.minLength(this.PHONE_LENGTH),
      Validators.maxLength(this.PHONE_LENGTH),
      Validators.pattern('[0-9]+')
    ]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(this.emailPattern)]],
    address: ['', [Validators.required, Validators.minLength(this.MIN_ADDRESS_LENGTH)]],
    is_youger: [this.isYouger],

    // Tutor fields
    document_type_tutor_id: [''],
    document_number_tutor: ['', [
      Validators.minLength(this.DOC_LENGTH),
      Validators.maxLength(this.DOC_LENGTH),
      Validators.pattern('[0-9]+')
    ]],
    first_name_tutor: ['', Validators.pattern(this.namePattern)],
    last_name_tutor: ['', Validators.pattern(this.namePattern)],
    celphone_tutor: ['', [
      Validators.minLength(this.PHONE_LENGTH),
      Validators.maxLength(this.PHONE_LENGTH),
      Validators.pattern('[0-9]+')
    ]],
    email_tutor: ['', [Validators.email, Validators.pattern(this.emailPattern)]],

    // Claim details
    claim_type_id: ['', Validators.required],
    order_number: ['', Validators.required],
    claimed_amount: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(this.MIN_DESC_LENGTH)]],
    consumption_type_id: ['', Validators.required],
    detail: ['', [Validators.required, Validators.minLength(this.MIN_DETAIL_LENGTH)]],
    request: ['', [Validators.required, Validators.minLength(this.MIN_DESC_LENGTH)]],
    attachment: [null],
    recaptcha: ['', Validators.required]
  });

  loadDocumentTypes() {
    this.claimsService.getDocumentTypes()
      .subscribe({
        next: (types) => {
          this.documentTypes = types;
        },
        error: (error) => {
          console.error('Error al cargar tipos de documento:', error);
        }
      });
  }

  loadConsumptionTypes() {
    this.claimsService.getConsumptionTypes()
      .subscribe({
        next: (types) => {
          this.consumptionTypes = types;
        },
        error: (error) => {
          console.error('Error al cargar tipos de consumo:', error);
        }
      });
  }

  loadClaimTypes() {
    this.claimsService.getClaimTypes()
      .subscribe({
        next: (types) => {
          this.claimTypes = types;
        },
        error: (error) => {
          console.error('Error al cargar tipos de reclamo:', error);
        }
      });
  }

  // Progress bar
  updateProgress(direction: 'next' | 'prev'): void {
    if (direction === 'next' && this.currentStep < this.totalSteps) {
      this.currentStep++;
    } else if (direction === 'prev' && this.currentStep > 1) {
      this.currentStep--;
    }

    this.progressWidth = (this.currentStep / this.totalSteps) * 100;
    this.updateStepsVisibility();
  }

  private updateStepsVisibility(): void {
    document.querySelectorAll('.form-steps').forEach((step, index) => {
      step.classList.toggle('active', index + 1 === this.currentStep);
    });
  }

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

  isYounger(value: boolean): void {
    this.isYouger = value;
  }

  isValidField(field: string): boolean | null {
    const control = this.claimForm.get(field);
    return control?.errors && control.touched || null;
  }

  getFieldError(field: string): string {
    const control = this.claimForm.get(field);
    if (!control?.errors) return '';

    const errors = control.errors;

    const errorMessages = {
      required: 'Este campo es obligatorio.',
      minlength: `Se requiere ${errors['minlength']?.requiredLength} carácteres como mínimo.`,
      maxlength: `Se requiere ${errors['maxlength']?.requiredLength} carácteres como máximo.`,
      pattern: 'Este campo contiene carácteres no permitidos.',
      email: 'No cumple con la estructura de un correo válido.'
    };

    return errorMessages[Object.keys(errors)[0] as keyof typeof errorMessages] || 'Error de validación';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.[0]) {
      const file = input.files[0];
      this.selectedFileName = file.name; // Actualiza el nombre del archivo seleccionado
      this.claimForm.get('attachment')?.setValue(file); // Vincula el archivo al FormControl
    } else {
      this.selectedFileName = null;
      // Evitar que el input mantenga el valor (porque no se puede asignar un archivo manualmente)
      input.value = '';
    }
  }

  async onSave(): Promise<void> {
    if (this.claimForm.invalid) {
      this.claimForm.markAllAsTouched();
      return;
    }

    try {
      // Preparar datos del cliente
      const customerData: ICustomer = {
        document_type_id: this.claimForm.get('document_type_id')?.value,
        document_number: Number(this.claimForm.get('document_number')?.value),
        first_name: this.claimForm.get('first_name')?.value,
        last_name: this.claimForm.get('last_name')?.value,
        email: this.claimForm.get('email')?.value,
        phone: this.claimForm.get('celphone')?.value,
        address: this.claimForm.get('address')?.value,
        is_adult: !this.isYouger
      };

      // Crear observable para el cliente
      const customerObservable = this.claimsService.createCustomer(customerData);

      // Si hay tutor, preparar sus datos
      let tutorObservable = null;
      if (this.isYouger) {
        const tutorData: ITutor = {
          document_type_id: this.claimForm.get('d_type_tutor')?.value,
          document_number: Number(this.claimForm.get('d_number_tutor')?.value),
          first_name: this.claimForm.get('first_name_tutor')?.value,
          last_name: this.claimForm.get('last_name_tutor')?.value,
          email: this.claimForm.get('email_tutor')?.value,
          phone: this.claimForm.get('celphone_tutor')?.value
        };
        tutorObservable = this.claimsService.createTutor(tutorData);
      }

      // Manejar las creaciones y el envío del reclamo
      if (tutorObservable) {
        forkJoin({
          customer: customerObservable,
          tutor: tutorObservable
        }).pipe(
          switchMap(({ customer, tutor }) => {
            const claimData = {
              ...this.claimForm.value,
              customer_id: customer.id,
              tutor_id: tutor.id
            };
            return this.createClaimWithFormData(claimData);
          })
        ).subscribe({
          next: (response) => {
            console.log('✅ Reclamo enviado con éxito:', response);
            this.sSend = true;
            this.resetForm();
          },
          error: (error) => {
            console.error('❌ Error al procesar el reclamo:', error);
            this.eSend = true;
          }
        });
      } else {
        customerObservable.pipe(
          switchMap(customer => {
            const claimData = {
              ...this.claimForm.value,
              customer_id: customer.id
            };
            return this.createClaimWithFormData(claimData);
          })
        ).subscribe({
          next: (response) => {
            console.log('✅ Reclamo enviado con éxito:', response);
            this.sSend = true;
            this.resetForm();
          },
          error: (error) => {
            console.error('❌ Error al procesar el reclamo:', error);
            this.eSend = true;
          }
        });
      }
    } catch (error) {
      console.error('❌ Error en el procesamiento:', error);
      this.eSend = true;
    }
  }

  private createClaimWithFormData(claimData: any) {
    const formData = new FormData();

    // Convertir claimData en FormData
    Object.keys(claimData).forEach(key => {
      const value = claimData[key];
      if (key === 'attachment' && value instanceof File) {
        formData.append('attachment', value); // Adjuntar archivo correctamente
      } else {
        formData.append(key, value);
      }
    });

    // Enviar el formulario como `multipart/form-data`
    return this.claimsService.createClaim(formData);
  }


  private resetForm(): void {
    this.claimForm.reset({
      document_type_id: '',
      document_type_tutor_id: '',
      consumption_type_id: '',
      claim_type_id: ''
    });

    this.currentStep = 1;
    this.progressWidth = (1 / this.currentStep) * 100;
    this.updateStepsVisibility();

    // Ocultar mensaje de envío
    setTimeout(() => {
      this.sSend = false;
    }, 3500);
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
