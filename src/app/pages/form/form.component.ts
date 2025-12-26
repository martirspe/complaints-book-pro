import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RecaptchaV3Module, ReCaptchaV3Service } from 'ng-recaptcha';
import { forkJoin, switchMap, catchError, throwError, of, finalize, debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { ToastService } from '../../shared/toast/toast.service';
import { SkeletonBlockComponent } from '../../shared/skeleton/skeleton-block.component';

// Services
import { ClaimsService } from '../../services/claims.service';
import { TenantService } from 'src/app/services/tenant.service';

// Interfaces
import { ICustomer } from '../../interfaces/customer.interface';
import { ITutor } from '../../interfaces/tutor.interface';
import { IClaimType } from '../../interfaces/claim-type.interface';
import { IDocumentType } from '../../interfaces/document-type.interface';
import { IConsumptionType } from '../../interfaces/consumption-type.interface';
import { ICurrency } from '../../interfaces/currency.interface';

// Environment
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-form',
  imports: [ReactiveFormsModule, RecaptchaV3Module, SkeletonBlockComponent],
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css']
})
export class FormComponent implements OnInit {

  // Información del tenant
  public tenant = this.tenantService.tenant;
  // Lazy loading: datos listos para mostrar
  public isDataReady = false;

  // Acción de reCAPTCHA v3
  private readonly recaptchaAction = 'claim_submit';

  // Variables para el formulario
  private readonly MIN_DESC_LENGTH = 100;
  private readonly MIN_DETAIL_LENGTH = 50;
  private readonly PHONE_LENGTH = 9;
  private readonly MIN_ADDRESS_LENGTH = 25;

  // Hints dinámicos por tipo de documento
  public docNumberHint = 'Ingresa tu número de documento';
  public tutorDocNumberHint = 'Ingresa el número de documento del tutor';

  // Reglas de validación por tipo de documento (debe coincidir exactamente con los nombres del seed)
  private readonly DOCUMENT_RULES: Record<string, { min: number; max: number; pattern: RegExp; hint: string }> = {
    'DNI': { min: 8, max: 8, pattern: /^[0-9]+$/, hint: 'DNI: exactamente 8 dígitos' },
    'CARNET DE EXTRANJERIA': { min: 9, max: 12, pattern: /^[0-9]+$/, hint: 'Carnet de Extranjería: 9 a 12 dígitos' },
    'PASAPORTE': { min: 6, max: 12, pattern: /^[A-Za-z0-9]+$/, hint: 'Pasaporte: 6 a 12 caracteres (letras y números)' },
    'RUC': { min: 11, max: 11, pattern: /^[0-9]+$/, hint: 'RUC: exactamente 11 dígitos' },
    'BREVETE': { min: 8, max: 8, pattern: /^[0-9]+$/, hint: 'Brevete: exactamente 8 dígitos' },
  };

  // Descripción de los tipos de reclamo
  public sDescription = '';

  // Variable para almacenar el nombre de archivo
  public selectedFileName: string | null = null;
  // Variable para almacenar el archivo adjunto
  private attachedFile: File | null = null;

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

  // Arreglo de monedas
  currencies: ICurrency[] = [];

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

  public getCurrencySymbol(): string {
    const currencyId = this.claimForm.get('currency_id')?.value;
    const currency = this.currencies.find(c => Number(c.id) === Number(currencyId));
    return currency ? currency.symbol : '';
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
        'currency_id',
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
      // Paso de revisión (solo lectura, sin campos obligatorios adicionales)
      return [];
    }
    return [];
  }

  // Obtiene la regla de validación según el tipo de documento seleccionado
  private getDocRuleByTypeControl(typeControlName: string, typeIdOverride?: number): { min: number; max: number; pattern: RegExp; hint: string } {
    // Usar el typeId pasado directamente o leerlo del formulario
    const typeId = typeIdOverride !== undefined ? typeIdOverride : this.claimForm.get(typeControlName)?.value;

    if (!typeId) {
      return { min: 6, max: 20, pattern: /^[A-Za-z0-9]+$/, hint: 'Selecciona primero un tipo de documento' };
    }

    // Convertir a número para asegurar comparación correcta (los IDs pueden venir como string del select)
    const numericTypeId = Number(typeId);
    const docType = this.documentTypes.find(t => Number(t.id) === numericTypeId);

    if (!docType) {
      return { min: 6, max: 20, pattern: /^[A-Za-z0-9]+$/, hint: 'Selecciona primero un tipo de documento' };
    }

    const typeName = docType.name.trim().toUpperCase();
    const rule = this.DOCUMENT_RULES[typeName];

    if (!rule) {
      return { min: 6, max: 20, pattern: /^[A-Za-z0-9]+$/, hint: 'Número de documento' };
    }

    return rule;
  }

  private applyDocumentValidators(typeControlName: string, numberControlName: string, hintField: 'docNumberHint' | 'tutorDocNumberHint', isRequired: boolean, typeIdOverride?: number): void {
    const rule = this.getDocRuleByTypeControl(typeControlName, typeIdOverride);
    const control = this.claimForm.get(numberControlName);
    if (!control) return;

    // Construir validadores en orden correcto
    const validators: any[] = [];
    if (isRequired) validators.push(Validators.required);
    validators.push(Validators.minLength(rule.min));
    validators.push(Validators.maxLength(rule.max));
    validators.push(Validators.pattern(rule.pattern));

    control.setValidators(validators);
    control.updateValueAndValidity({ emitEvent: false });

    // Actualizar hints
    if (hintField === 'docNumberHint') this.docNumberHint = rule.hint;
    if (hintField === 'tutorDocNumberHint') this.tutorDocNumberHint = rule.hint;
  }

  public isStepValid(step: number): boolean {
    const controls = this.getStepControls(step);
    return controls.every(name => this.claimForm.get(name)?.valid);
  }

  private setupDocumentTypeValidation(): void {
    // Cuando cambia el tipo de documento del cliente
    this.claimForm.get('document_type_id')?.valueChanges.subscribe((typeId) => {
      if (!typeId) return;
      // Revalidar el campo de número de documento inmediatamente, pasando el typeId directamente
      this.applyDocumentValidators('document_type_id', 'document_number', 'docNumberHint', true, typeId);
      // Limpiar campos autocompletados y estado de tutor al cambiar tipo
      this.claimForm.patchValue({
        document_number: '',
        first_name: '',
        last_name: '',
        email: '',
        celphone: '',
        address: '',
        // Resetear tutor completo
        is_youger: false,
        document_type_tutor_id: '',
        document_number_tutor: '',
        first_name_tutor: '',
        last_name_tutor: '',
        email_tutor: '',
        celphone_tutor: ''
      }, { emitEvent: false });
      this.isYouger = false;
      this.lastCustomerDocLoaded = null;
      this.customerAutoFilled = false;
      this.tutorAutoFilled = false;
    });

    // Cuando cambia el tipo de documento del tutor
    this.claimForm.get('document_type_tutor_id')?.valueChanges.subscribe((typeId) => {
      if (!this.isYouger || !typeId) return;
      // Revalidar el campo de número de documento del tutor, pasando el typeId directamente
      this.applyDocumentValidators('document_type_tutor_id', 'document_number_tutor', 'tutorDocNumberHint', true, typeId);
      // Limpiar campos autocompletados del tutor al cambiar tipo
      this.claimForm.patchValue({
        document_number_tutor: '',
        first_name_tutor: '',
        last_name_tutor: '',
        email_tutor: '',
        celphone_tutor: ''
      }, { emitEvent: false });
      this.lastTutorDocLoaded = null;
      this.tutorAutoFilled = false;
    });
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
      this.toast.showWarning('Por favor completa los pasos anteriores primero');
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
      this.toast.showWarning('Revisa los campos incompletos o incorrectos');
    }
  }

  // Patterns
  private readonly namePattern = '^[a-zA-ZÀ-ÿ\u00f1\u00d1]+(\s*[a-zA-ZÀ-ÿ\u00f1\u00d1 ]*)*[a-zA-ZÀ-ÿ\u00f1\u00d1]+$';
  private readonly emailPattern = '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$';

  constructor(
    private fb: FormBuilder,
    private claimsService: ClaimsService,
    private toast: ToastService,
    private tenantService: TenantService,
    private recaptchaV3Service: ReCaptchaV3Service
  ) { }

  ngOnInit(): void {
    this.loadDocumentTypes();
    this.loadConsumptionTypes();
    this.loadClaimTypes();
    this.loadCurrencies();
    this.setupYoungerValidation();
    // setupDocumentTypeValidation se llama en loadDocumentTypes después de cargar los tipos
    this.setupCustomerLookupByDocument();
    this.setupTutorLookupByDocument();
    // Marcar datos como listos cuando todas las cargas terminen
    this.checkAllDataReady();
  }

  private checkAllDataReady(): void {
    forkJoin([
      of(this.documentTypes.length > 0),
      of(this.consumptionTypes.length > 0),
      of(this.claimTypes.length > 0),
      of(this.currencies.length > 0)
    ]).subscribe(() => {
      setTimeout(() => {
        this.isDataReady = this.documentTypes.length > 0 && this.consumptionTypes.length > 0 && this.claimTypes.length > 0 && this.currencies.length > 0;
      }, 300);
    });
  }

  setupYoungerValidation(): void {
    this.claimForm.get('is_youger')?.valueChanges.subscribe((isYounger: boolean) => {
      // Sincronizar la variable visual con el valor del FormControl
      this.isYouger = isYounger;

      const phoneLen = this.PHONE_LENGTH;

      const setValidators = (field: string, validators: any[]) => {
        const control = this.claimForm.get(field);
        if (!control) return;
        control.setValidators(validators);
        control.updateValueAndValidity();
      };

      if (isYounger) {
        setValidators('document_type_tutor_id', [Validators.required]);
        // Validación dinámica según tipo de documento del tutor
        this.applyDocumentValidators('document_type_tutor_id', 'document_number_tutor', 'tutorDocNumberHint', true);
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

      // Actualizar la validez del formulario sin perder el estado visual de los campos ya validados
      this.claimForm.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    });
  }


  public claimForm: FormGroup = this.fb.group({
    document_type_id: ['', Validators.required],
    document_number: ['', [Validators.required]],
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
    document_number_tutor: ['', []],
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
    currency_id: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(this.MIN_DESC_LENGTH)]],
    consumption_type_id: ['', Validators.required],
    detail: ['', [Validators.required, Validators.minLength(this.MIN_DETAIL_LENGTH)]],
    request: ['', [Validators.required, Validators.minLength(this.MIN_DESC_LENGTH)]],
    attachment: [null],
    recaptcha: ['']
  });

  loadDocumentTypes() {
    this.claimsService.getDocumentTypes()
      .subscribe({
        next: (types) => {
          this.documentTypes = types;

          // IMPORTANTE: Configurar suscripciones DESPUÉS de tener los tipos cargados
          this.setupDocumentTypeValidation();

          // Solo después de cargar los tipos, aplicar validadores iniciales si hay selección
          const selectedTypeId = this.claimForm.get('document_type_id')?.value;
          if (selectedTypeId) {
            this.applyDocumentValidators('document_type_id', 'document_number', 'docNumberHint', true);
          }
          // Lo mismo para tutor
          if (this.isYouger) {
            const selectedTutorTypeId = this.claimForm.get('document_type_tutor_id')?.value;
            if (selectedTutorTypeId) {
              this.applyDocumentValidators('document_type_tutor_id', 'document_number_tutor', 'tutorDocNumberHint', true);
            }
          }
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

  loadCurrencies() {
    this.claimsService.getCurrencies()
      .subscribe({
        next: (currencies) => {
          this.currencies = currencies;
        },
        error: (error) => {
          console.error('Error al cargar monedas:', error);
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
    // Sincronizar el FormControl con el valor
    this.claimForm.get('is_youger')?.setValue(value, { emitEvent: true });
  }

  isValidField(field: string): boolean | null {
    const control = this.claimForm.get(field);
    return !!(control?.valid && control?.touched) || null;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.claimForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  public isFieldValid(field: string): boolean {
    const control = this.claimForm.get(field);
    return !!(control?.valid && control?.touched);
  }

  getFieldError(field: string): string {
    const control = this.claimForm.get(field);
    if (!control?.errors) return '';

    const errors = control.errors;
    const errorKey = Object.keys(errors)[0];

    // Mensajes dinámicos para campos de documento según el tipo seleccionado
    if (field === 'document_number' || field === 'document_number_tutor') {
      const typeControlName = field === 'document_number' ? 'document_type_id' : 'document_type_tutor_id';
      const rule = this.getDocRuleByTypeControl(typeControlName);

      const docSpecificMessages: { [error: string]: string } = {
        required: 'Este campo es obligatorio',
        minlength: rule.hint,
        maxlength: rule.hint,
        pattern: rule.hint
      };

      return docSpecificMessages[errorKey] || 'Por favor verifica este campo';
    }

    // Mensajes más específicos y humanizados por campo
    const fieldSpecificMessages: { [key: string]: { [error: string]: string } } = {
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.[0]) {
      const file = input.files[0];

      // Validar tamaño (150KB = 153600 bytes)
      const maxSize = 153600;
      if (file.size > maxSize) {
        this.toast.showWarning('El archivo es demasiado pesado. Máximo permitido: 150KB');
        input.value = '';
        return;
      }

      // Validar tipo
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        this.toast.showWarning('Solo aceptamos archivos en formato PDF, DOC o DOCX');
        input.value = '';
        return;
      }

      this.selectedFileName = file.name;
      this.attachedFile = file;
    } else {
      this.selectedFileName = null;
      this.attachedFile = null;
      input.value = '';
    }
  }

  // Método para remover archivo adjunto
  removeAttachment(): void {
    this.selectedFileName = null;
    this.attachedFile = null;
    const fileInput = document.getElementById('attachment') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  async onSave(): Promise<void> {
    try {
      this.isSubmitting = true;

      // Obtener token score-based de reCAPTCHA v3 antes de validar/enviar
      let recaptchaToken = '';
      try {
        recaptchaToken = await this.executeRecaptcha();
      } catch (recaptchaError) {
        this.toast.showError('No pudimos validar reCAPTCHA. Intenta de nuevo.');
        this.isSubmitting = false;
        return;
      }

      this.claimForm.get('recaptcha')?.setValue(recaptchaToken);

      if (this.claimForm.invalid) {
        this.claimForm.markAllAsTouched();
        this.isSubmitting = false;
        return;
      }
      // Preparar datos del cliente
      const customerData: ICustomer = {
        document_type_id: this.claimForm.get('document_type_id')?.value,
        document_number: String(this.claimForm.get('document_number')?.value || '').trim(),
        first_name: this.claimForm.get('first_name')?.value,
        last_name: this.claimForm.get('last_name')?.value,
        email: this.claimForm.get('email')?.value,
        phone: this.claimForm.get('celphone')?.value,
        address: this.claimForm.get('address')?.value,
        is_younger: this.isYouger
      };

      // Buscar cliente por documento; si existe, usarlo. Si no, crearlo.
      const customerObservable = this.claimsService.getCustomerByDocument(customerData.document_number as string).pipe(
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
            return this.createClaim(claimData);
          })
        ).pipe(
          finalize(() => { this.isSubmitting = false; })
        ).subscribe({
          next: (response) => {
            this.toast.showSuccess((response as any)?.message || 'Tu reclamo fue enviado correctamente');
            this.resetForm();
          },
          error: (error) => {
            this.handleErrorToast(error, 'Hubo un problema al procesar tu reclamo');
            this.eSend = true;
          }
        });
      } else {
        customerObservable.pipe(
          switchMap(customer => {
            const claimData = this.buildClaimPayload({
              customer_id: this.extractId(customer)
            });
            return this.createClaim(claimData);
          }),
          finalize(() => { this.isSubmitting = false; })
        ).subscribe({
          next: (response) => {
            this.toast.showSuccess((response as any)?.message || 'Tu reclamo fue enviado correctamente');
            this.resetForm();
          },
          error: (error) => {
            this.handleErrorToast(error, 'Hubo un problema al procesar tu reclamo');
            this.eSend = true;
          }
        });
      }
    } catch (error) {
      console.error('Error en el procesamiento:', error);
      this.eSend = true;
      this.isSubmitting = false;
    }
  }

  private setupCustomerLookupByDocument(): void {
    this.claimForm.get('document_number')?.valueChanges.pipe(
      debounceTime(600), // Esperar 600ms después de que el usuario deje de escribir
      distinctUntilChanged() // Solo emitir si el valor cambió
    ).subscribe((docNumber) => {
      const v = String(docNumber || '').trim();

      // No hacer nada si está vacío o ya se cargó este documento
      if (!v || (this.lastCustomerDocLoaded === v)) return;

      // Validar que cumpla con el formato esperado
      const rule = this.getDocRuleByTypeControl('document_type_id');
      const isValidFormat = v.length >= rule.min && v.length <= rule.max && rule.pattern.test(v);

      // Solo buscar si el formato es válido y es completamente numérico (para búsqueda en BD)
      if (isValidFormat && /^[0-9]+$/.test(v)) {
        this.claimsService.getCustomerByDocument(v).subscribe({
          next: (customer) => {
            this.populateCustomerForm(customer);
          },
          error: (err) => {
            if (err?.status !== 404) {
              this.toast.showWarning('No pudimos cargar los datos del cliente');
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
    this.lastCustomerDocLoaded = String(customer.document_number);
    this.customerAutoFilled = true;

    this.toast.showSuccess('Cliente encontrado. Datos cargados automáticamente');
  }

  private setupTutorLookupByDocument(): void {
    this.claimForm.get('document_number_tutor')?.valueChanges.pipe(
      debounceTime(600), // Esperar 600ms después de que el usuario deje de escribir
      distinctUntilChanged() // Solo emitir si el valor cambió
    ).subscribe((docNumber) => {
      // Solo aplica si requiere tutor
      if (!this.isYouger) return;

      const v = String(docNumber || '').trim();

      // No hacer nada si está vacío o ya se cargó este documento
      if (!v || (this.lastTutorDocLoaded === v)) return;

      // Validar que cumpla con el formato esperado
      const rule = this.getDocRuleByTypeControl('document_type_tutor_id');
      const isValidFormat = v.length >= rule.min && v.length <= rule.max && rule.pattern.test(v);

      // Solo buscar si el formato es válido y es completamente numérico (para búsqueda en BD)
      if (isValidFormat && /^[0-9]+$/.test(v)) {
        this.claimsService.getTutorByDocument(v).subscribe({
          next: (tutor) => {
            this.populateTutorForm(tutor as any);
          },
          error: (err) => {
            if (err?.status !== 404) {
              this.toast.showWarning('No pudimos cargar los datos del tutor');
            }
          }
        });
      }
    });
  }

  private populateTutorForm(tutor: ITutor): void {
    this.claimForm.patchValue({
      document_type_tutor_id: tutor.document_type_id,
      document_number_tutor: String(tutor.document_number),
      first_name_tutor: tutor.first_name,
      last_name_tutor: tutor.last_name,
      email_tutor: tutor.email,
      celphone_tutor: tutor.phone,
    }, { emitEvent: false });
    this.lastTutorDocLoaded = String(tutor.document_number);
    this.tutorAutoFilled = true;

    this.toast.showSuccess('Tutor encontrado. Datos cargados automáticamente');
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
      currency_id: fv.currency_id,
      order_number: fv.order_number,
      claimed_amount: fv.claimed_amount,
      description: fv.description,
      detail: fv.detail,
      request: fv.request,
      attachment: this.attachedFile,
      recaptcha: fv.recaptcha
    };
  }

  private createClaim(claimData: any) {

    const hasAttachment = claimData.attachment instanceof File;

    // 🟢 CASO 1: SIN ARCHIVO → JSON (como Postman)
    if (!hasAttachment) {
      const payload = {
        customer_id: Number(claimData.customer_id),
        tutor_id: claimData.tutor_id ? Number(claimData.tutor_id) : undefined,
        claim_type_id: Number(claimData.claim_type_id),
        consumption_type_id: Number(claimData.consumption_type_id),
        currency_id: Number(claimData.currency_id),
        order_number: Number(claimData.order_number),
        claimed_amount: Number(claimData.claimed_amount),
        description: claimData.description,
        detail: claimData.detail,
        request: claimData.request,
        recaptcha: claimData.recaptcha
      };

      return this.claimsService.createClaim(
        this.tenantService.tenantSlug(),
        payload // 👈 JSON
      );
    }

    // 🟠 CASO 2: CON ARCHIVO → multipart/form-data
    const formData = new FormData();

    Object.entries(claimData).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;

      if (key === 'attachment' && value instanceof File) {
        formData.append('attachment', value);
      } else {
        formData.append(key, String(value));
      }
    });

    return this.claimsService.createClaim(
      this.tenantService.tenantSlug(),
      formData
    );
  }


  private async executeRecaptcha(): Promise<string> {
    const token = await firstValueFrom(this.recaptchaV3Service.execute(this.recaptchaAction));
    if (!token) {
      throw new Error('No se pudo obtener token de reCAPTCHA');
    }
    return token;
  }


  private resetForm(): void {
    this.claimForm.reset({
      // Selects
      document_type_id: '',
      document_type_tutor_id: '',
      consumption_type_id: '',
      currency_id: '',
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
    this.attachedFile = null;

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

}
