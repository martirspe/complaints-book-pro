import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, switchMap, catchError, throwError, of, finalize } from 'rxjs';
import { ToastService } from '../shared/toast/toast.service';
import { BrandingService } from '../services/branding.service';

// Services
import { ClaimsService } from '../services/claims.service';

// Interfaces
import { IClaimType } from '../interfaces/claim-type.interface';
import { IDocumentType } from '../interfaces/document-type.interface';
import { IConsumptionType } from '../interfaces/consumption-type.interface';
import { ICustomer } from '../interfaces/customer.interface';
import { ITutor } from '../interfaces/tutor.interface';
import { IBranding } from '../interfaces/branding.interface';

@Component({
  selector: 'app-form-page',
  templateUrl: './form-page.component.html',
  styleUrls: ['./form-page.component.css']
})
export class FormPageComponent implements OnInit {

  // Branding dinámico
  public branding: IBranding | null = null;

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
  readonly totalSteps = 4; // Ahora incluye paso de revisión
  public currentStep = 1;
  public progressWidth = (1 / this.totalSteps) * 100;

  // Labels descriptivos para cada paso
  public stepLabels = [
    'Datos Personales',
    'Tipo de Consumo',
    'Detalles del Reclamo',
    'Revisión Final'
  ];

  // Obtener el año actual
  currentYear = new Date().getFullYear();

  // Estados de autocompletado
  public customerAutoFilled = false;
  public tutorAutoFilled = false;

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
  // Estado de envío
  public isSubmitting = false;
  // Evitar bucles de autocompletado
  private lastCustomerDocLoaded: string | null = null;
  private lastTutorDocLoaded: string | null = null;

  // Campos por paso para validación
  public getCurrentStepLabel(): string {
    return this.stepLabels[this.currentStep - 1] || '';
  }

  private getStepControls(step: number): string[] {
    if (step === 1) {
      const base = [
        'document_type_id',
        'document_number',
        'first_name',
        'last_name',
        'celphone',
        'email',
        'address'
      ];
      if (this.isYouger) {
        base.push(
          'document_type_tutor_id',
          'document_number_tutor',
          'first_name_tutor',
          'last_name_tutor',
          'celphone_tutor',
          'email_tutor'
        );
      }
      return base;
    }
    if (step === 2) {
      return [
        'consumption_type_id',
        'order_number',
        'claimed_amount',
        'description'
      ];
    }
    if (step === 3) {
      return [
        'claim_type_id',
        'detail',
        'request'
      ];
    }
    if (step === 4) {
      // Paso de revisión: validar recaptcha
      return ['recaptcha'];
    }
    return [];
  }

  public isStepValid(step: number): boolean {
    const controls = this.getStepControls(step);
    return controls.every(name => this.claimForm.get(name)?.valid);
  }

  // Valida en cadena si todos los pasos anteriores están completos
  private allStepsValidUpTo(step: number): boolean {
    for (let i = 1; i < step; i++) {
      if (!this.isStepValid(i)) return false;
    }
    return true;
  }

  // Determina si se puede navegar al paso solicitado
  public canNavigateTo(step: number): boolean {
    if (step <= this.currentStep) return true; // Siempre permitir ir hacia atrás
    return this.allStepsValidUpTo(step); // Hacia adelante solo si los previos son válidos
  }

  // Maneja clics en el stepper para navegar entre pasos
  public onStepClick(step: number): void {
    if (step === this.currentStep) return;
    if (!this.canNavigateTo(step)) {
      this.toast.showWarning('Completa los pasos previos antes de avanzar');
      return;
    }
    this.currentStep = step;
    this.progressWidth = (this.currentStep / this.totalSteps) * 100;
    this.updateStepsVisibility();
  }

  private markStepFieldsTouched(step: number): void {
    const controls = this.getStepControls(step);
    controls.forEach(name => this.claimForm.get(name)?.markAsTouched());
  }

  public goNextIfValid(step: number): void {
    if (this.isStepValid(step)) {
      this.nextStep();
    } else {
      this.markStepFieldsTouched(step);
      this.toast.showWarning('Por favor corrige los campos pendientes antes de continuar');
    }
  }

  // Patterns
  private readonly namePattern = '^[a-zA-ZÀ-ÿ\u00f1\u00d1]+(\s*[a-zA-ZÀ-ÿ\u00f1\u00d1 ]*)*[a-zA-ZÀ-ÿ\u00f1\u00d1]+$';
  private readonly emailPattern = '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$';

  constructor(
    private fb: FormBuilder,
    private claimsService: ClaimsService,
    private toast: ToastService,
    private brandingService: BrandingService
  ) {
    setInterval(() => {
      this.flag = !this.flag;
    }, 60000);
  }

  ngOnInit(): void {
    // Cargar branding desde el servidor y aplicar tema
    this.brandingService.getBranding().subscribe({
      next: (branding) => {
        this.branding = branding;
        this.brandingService.applyTheme(branding);
        // Actualizar título del documento con la marca
        if (branding?.companyBrand) {
          document.title = `${branding.companyBrand} | Libro de Reclamaciones`;
        }
      },
      error: (error) => {
        console.error('Error al cargar branding:', error);
      }
    });
    this.loadDocumentTypes();
    this.loadConsumptionTypes();
    this.loadClaimTypes();
    this.setupYoungerValidation();
    this.setupCustomerLookupByDocument();
    this.setupTutorLookupByDocument();
  }

  setupYoungerValidation(): void {
    this.claimForm.get('is_youger')?.valueChanges.subscribe((isYounger: boolean) => {
      const docLen = this.DOC_LENGTH;
      const phoneLen = this.PHONE_LENGTH;

      const setValidators = (field: string, validators: any[]) => {
        const control = this.claimForm.get(field);
        if (!control) return;
        control.setValidators(validators);
        control.updateValueAndValidity();
      };

      if (isYounger) {
        setValidators('document_type_tutor_id', [Validators.required]);
        setValidators('document_number_tutor', [
          Validators.required,
          Validators.minLength(docLen),
          Validators.maxLength(docLen),
          Validators.pattern('[0-9]+')
        ]);
        setValidators('first_name_tutor', [Validators.required, Validators.pattern(this.namePattern)]);
        setValidators('last_name_tutor', [Validators.required, Validators.pattern(this.namePattern)]);
        setValidators('celphone_tutor', [
          Validators.required,
          Validators.minLength(phoneLen),
          Validators.maxLength(phoneLen),
          Validators.pattern('[0-9]+')
        ]);
        setValidators('email_tutor', [Validators.required, Validators.email, Validators.pattern(this.emailPattern)]);
      } else {
        ['document_type_tutor_id', 'document_number_tutor', 'first_name_tutor', 'last_name_tutor', 'celphone_tutor', 'email_tutor']
          .forEach(field => {
            const control = this.claimForm.get(field);
            if (!control) return;
            control.clearValidators();
            // Reset to empty string so selects show placeholder (not null)
            control.reset('');
            control.updateValueAndValidity();
          });
      }

      // Sin requerir tutor, el formulario no debe quedar inválido por esos campos
      this.claimForm.markAsPristine();
      this.claimForm.markAsUntouched();
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
    // Mantener sincronizado el FormControl para disparar validación/reactividad
    this.claimForm.get('is_youger')?.setValue(value);
  }

  isValidField(field: string): boolean | null {
    const control = this.claimForm.get(field);
    return control?.errors && control.touched || null;
  }

  getFieldError(field: string): string {
    const control = this.claimForm.get(field);
    if (!control?.errors) return '';

    const errors = control.errors;

    // Mensajes más específicos y humanizados por campo
    const fieldSpecificMessages: { [key: string]: { [error: string]: string } } = {
      document_number: {
        minlength: 'El número de documento debe tener exactamente 8 dígitos',
        maxlength: 'El número de documento debe tener exactamente 8 dígitos',
        pattern: 'Por favor ingresa solo números'
      },
      celphone: {
        minlength: 'El número de celular debe tener 9 dígitos',
        maxlength: 'El número de celular debe tener 9 dígitos',
        pattern: 'Por favor ingresa solo números'
      },
      email: {
        email: 'Por favor ingresa un correo electrónico válido (ejemplo: usuario@dominio.com)',
        pattern: 'Por favor ingresa un correo electrónico válido'
      },
      first_name: {
        pattern: 'El nombre solo puede contener letras y espacios'
      },
      last_name: {
        pattern: 'Los apellidos solo pueden contener letras y espacios'
      },
      address: {
        minlength: 'Por favor proporciona una dirección más completa (mínimo 25 caracteres)'
      },
      description: {
        minlength: 'Por favor describe tu caso con más detalle (mínimo 100 caracteres)'
      },
      detail: {
        minlength: 'Por favor explica el detalle de tu reclamo (mínimo 50 caracteres)'
      },
      request: {
        minlength: 'Por favor indica claramente qué solicitas (mínimo 100 caracteres)'
      }
    };

    const errorKey = Object.keys(errors)[0];

    // Buscar mensaje específico para el campo
    if (fieldSpecificMessages[field]?.[errorKey]) {
      return fieldSpecificMessages[field][errorKey];
    }

    // Mensajes genéricos mejorados
    const errorMessages: { [key: string]: string } = {
      required: 'Este campo es obligatorio',
      minlength: `Debe tener al menos ${errors['minlength']?.requiredLength} caracteres`,
      maxlength: `No puede exceder ${errors['maxlength']?.requiredLength} caracteres`,
      pattern: 'El formato ingresado no es válido',
      email: 'Por favor ingresa un correo electrónico válido'
    };

    return errorMessages[errorKey] || 'Por favor verifica este campo';
  }

  // Método para validar si un campo es válido (para mostrar icono de éxito)
  public isFieldValid(field: string): boolean {
    const control = this.claimForm.get(field);
    return !!(control?.valid && control?.touched);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.[0]) {
      const file = input.files[0];

      // Validar tamaño (150KB = 153600 bytes)
      const maxSize = 153600;
      if (file.size > maxSize) {
        this.toast.showWarning(`El archivo es muy grande. Tamaño máximo: 150KB`);
        input.value = '';
        return;
      }

      // Validar tipo
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        this.toast.showWarning('Solo se permiten archivos PDF, DOC o DOCX');
        input.value = '';
        return;
      }

      this.selectedFileName = file.name;
      this.claimForm.get('attachment')?.setValue(file);
    } else {
      this.selectedFileName = null;
      input.value = '';
    }
  }

  // Método para remover archivo adjunto
  removeAttachment(): void {
    this.selectedFileName = null;
    this.claimForm.get('attachment')?.setValue(null);
    const fileInput = document.getElementById('attachment') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  async onSave(): Promise<void> {
    if (this.claimForm.invalid) {
      this.claimForm.markAllAsTouched();
      return;
    }

    try {
      this.isSubmitting = true;
      // Preparar datos del cliente
      const customerData: ICustomer = {
        document_type_id: this.claimForm.get('document_type_id')?.value,
        document_number: Number(this.claimForm.get('document_number')?.value),
        first_name: this.claimForm.get('first_name')?.value,
        last_name: this.claimForm.get('last_name')?.value,
        email: this.claimForm.get('email')?.value,
        phone: this.claimForm.get('celphone')?.value,
        address: this.claimForm.get('address')?.value,
        is_younger: this.isYouger
      };

      // Buscar cliente por documento; si existe, usarlo. Si no, crearlo.
      const customerObservable = this.claimsService.getCustomerByDocument(customerData.document_number).pipe(
        // Si no existe (404), crear
        catchError((err) => {
          if (err?.status === 404) {
            return of(null);
          }
          return throwError(() => err);
        }),
        switchMap((found) => {
          if (found && found.id) return of(found);
          return this.claimsService.createCustomer(customerData);
        })
      );

      // Si hay tutor, preparar sus datos
      let tutorObservable = null;
      if (this.isYouger) {
        const tutorData: ITutor = {
          document_type_id: this.claimForm.get('document_type_tutor_id')?.value,
          document_number: String(this.claimForm.get('document_number_tutor')?.value || '').trim(),
          first_name: this.claimForm.get('first_name_tutor')?.value,
          last_name: this.claimForm.get('last_name_tutor')?.value,
          email: this.claimForm.get('email_tutor')?.value,
          phone: this.claimForm.get('celphone_tutor')?.value
        };
        // Buscar tutor primero; si no existe, crearlo
        const docNumForLookup = String(tutorData.document_number);
        tutorObservable = this.claimsService.getTutorByDocument(docNumForLookup).pipe(
          catchError((err) => {
            if (err?.status === 404) return of(null);
            return throwError(() => err);
          }),
          switchMap((found) => {
            if (found && (found as any).id) return of(found);
            return this.claimsService.createTutor(tutorData);
          })
        );
      }

      // Manejar las creaciones y el envío del reclamo
      if (tutorObservable) {
        forkJoin({
          customer: customerObservable,
          tutor: tutorObservable
        }).pipe(
          switchMap(({ customer, tutor }) => {
            const claimData = this.buildClaimPayload({
              customer_id: this.extractId(customer),
              tutor_id: this.extractId(tutor)
            });
            return this.createClaimWithFormData(claimData);
          })
        ).pipe(
          finalize(() => { this.isSubmitting = false; })
        ).subscribe({
          next: (response) => {
            this.toast.showSuccess((response as any)?.message || 'Reclamo enviado con éxito');
            this.resetForm();
          },
          error: (error) => {
            this.handleErrorToast(error, 'Error al procesar el reclamo');
            this.eSend = true;
          }
        });
      } else {
        customerObservable.pipe(
          switchMap(customer => {
            const claimData = this.buildClaimPayload({
              customer_id: this.extractId(customer)
            });
            return this.createClaimWithFormData(claimData);
          }),
          finalize(() => { this.isSubmitting = false; })
        ).subscribe({
          next: (response) => {
            this.toast.showSuccess((response as any)?.message || 'Reclamo enviado con éxito');
            this.resetForm();
          },
          error: (error) => {
            this.handleErrorToast(error, 'Error al procesar el reclamo');
            this.eSend = true;
          }
        });
      }
    } catch (error) {
      console.error('❌ Error en el procesamiento:', error);
      this.eSend = true;
      this.isSubmitting = false;
    }
  }

  private setupCustomerLookupByDocument(): void {
    const control = this.claimForm.get('document_number');
    control?.valueChanges.subscribe((val) => {
      const v = String(val || '').trim();
      if (this.lastCustomerDocLoaded && v === this.lastCustomerDocLoaded) return;
      if (v.length === this.DOC_LENGTH && /^[0-9]+$/.test(v)) {
        const docNumber = Number(v);
        this.claimsService.getCustomerByDocument(docNumber).subscribe({
          next: (customer) => {
            this.populateCustomerForm(customer);
          },
          error: (err) => {
            if (err?.status !== 404) {
              this.toast.showWarning('No se pudo cargar datos del cliente');
            }
          }
        });
      }
    });
  }

  private populateCustomerForm(customer: ICustomer): void {
    this.claimForm.patchValue({
      document_type_id: customer.document_type_id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      celphone: customer.phone,
      address: customer.address,
      is_youger: customer.is_younger ?? false,
    }, { emitEvent: false });
    this.isYouger = !!customer.is_younger;
    this.lastCustomerDocLoaded = String(customer.document_number).padStart(this.DOC_LENGTH, '0');
    this.customerAutoFilled = true;
    this.toast.showSuccess('✓ Cliente encontrado - Datos cargados automáticamente');
  }

  private setupTutorLookupByDocument(): void {
    const control = this.claimForm.get('document_number_tutor');
    control?.valueChanges.subscribe((val) => {
      if (!this.isYouger) return; // Solo aplica si requiere tutor
      const v = String(val || '').trim();
      if (this.lastTutorDocLoaded && v === this.lastTutorDocLoaded) return;
      if (v.length === this.DOC_LENGTH && /^[0-9]+$/.test(v)) {
        this.claimsService.getTutorByDocument(v).subscribe({
          next: (tutor) => {
            this.populateTutorForm(tutor as any);
          },
          error: (err) => {
            if (err?.status !== 404) {
              this.toast.showWarning('No se pudo cargar datos del tutor');
            }
          }
        });
      }
    });
  }

  private populateTutorForm(tutor: ITutor): void {
    this.claimForm.patchValue({
      document_type_tutor_id: (tutor as any).document_type_id,
      document_number_tutor: String((tutor as any).document_number).padStart(this.DOC_LENGTH, '0'),
      first_name_tutor: (tutor as any).first_name,
      last_name_tutor: (tutor as any).last_name,
      email_tutor: (tutor as any).email,
      celphone_tutor: (tutor as any).phone,
    }, { emitEvent: false });
    this.lastTutorDocLoaded = String((tutor as any).document_number).padStart(this.DOC_LENGTH, '0');
    this.tutorAutoFilled = true;
    this.toast.showSuccess('✓ Tutor encontrado - Datos cargados automáticamente');
  }

  private handleErrorToast(error: any, fallback: string) {
    try {
      const status = error?.status;
      const body = error?.error;
      if (status === 422 && body?.errors?.length) {
        const first = body.errors[0];
        this.toast.showError(`${first.field}: ${first.message}`);
      } else if ((status === 400 || status === 409 || status === 404) && body?.message) {
        this.toast.showError(body.message);
      } else {
        this.toast.showError(fallback);
      }
    } catch {
      this.toast.showError(fallback);
    }
  }

  // Extrae id de respuestas potencialmente anidadas
  private extractId(entity: any): number | undefined {
    if (!entity) return undefined;
    return entity.id ?? entity?.data?.id ?? entity?.customer?.id ?? undefined;
  }

  // Construye solo los campos requeridos por el endpoint de reclamos
  private buildClaimPayload(base: { customer_id?: number; tutor_id?: number }) {
    const fv = this.claimForm.value;
    return {
      customer_id: base.customer_id,
      tutor_id: base.tutor_id,
      claim_type_id: fv.claim_type_id,
      consumption_type_id: fv.consumption_type_id,
      order_number: fv.order_number,
      claimed_amount: fv.claimed_amount,
      description: fv.description,
      detail: fv.detail,
      request: fv.request,
      attachment: fv.attachment,
      recaptcha: fv.recaptcha
    };
  }

  private createClaimWithFormData(claimData: any) {
    const formData = new FormData();

    // Normalizar y convertir claimData en FormData (solo campos de reclamo)
    const numericKeys = ['customer_id', 'tutor_id', 'claim_type_id', 'consumption_type_id', 'order_number', 'claimed_amount'];
    const booleanKeys = ['resolved'];
    Object.keys(claimData).forEach(key => {
      const value = claimData[key];
      if (value === undefined || value === null || value === '') return; // omitir vacíos
      if (key === 'attachment' && value instanceof File) {
        formData.append('attachment', value);
      } else if (numericKeys.includes(key)) {
        formData.append(key, String(value));
      } else if (booleanKeys.includes(key)) {
        formData.append(key, value ? 'true' : 'false');
      } else {
        formData.append(key, value);
      }
    });

    // Asegurar customer_id presente y correcto
    if (claimData.customer_id !== undefined && claimData.customer_id !== null) {
      formData.set('customer_id', String(claimData.customer_id));
    }

    // Enviar el formulario como `multipart/form-data`
    return this.claimsService.createClaim(formData);
  }


  private resetForm(): void {
    this.claimForm.reset({
      // Selects
      document_type_id: '',
      document_type_tutor_id: '',
      consumption_type_id: '',
      claim_type_id: '',
      // Booleans
      is_youger: false,
      // Files and tokens
      attachment: null,
      recaptcha: ''
    });

    // Reflect radio state and UI flags
    this.isYouger = false;
    this.selectedFileName = null;

    // Reset progress to first step
    this.currentStep = 1;
    this.progressWidth = (1 / this.totalSteps) * 100;
    this.updateStepsVisibility();

    // Clear auto-fill trackers
    this.lastCustomerDocLoaded = null;
    this.lastTutorDocLoaded = null;
    this.customerAutoFilled = false;
    this.tutorAutoFilled = false;

    // Restore pristine/untouched state
    this.claimForm.markAsPristine();
    this.claimForm.markAsUntouched();
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
