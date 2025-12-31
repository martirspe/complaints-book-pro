// --- IMPORTS - ANGULAR
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

// --- IMPORTS - RXJS
import { forkJoin, switchMap, catchError, throwError, of, debounceTime, distinctUntilChanged, firstValueFrom, Subject, takeUntil, tap } from 'rxjs';

// --- IMPORTS - SHARED
import { ToastService } from '../../shared/toast/toast.service';
import { SkeletonBlockComponent } from '../../shared/skeleton/skeleton-block.component';

// --- IMPORTS - SERVICES
import { ClaimsService } from '../../services/claims.service';
import { TenantService } from 'src/app/services/tenant.service';
import { RecaptchaService } from '../../services/recaptcha.service';

// --- IMPORTS - INTERFACES
import { Customer } from '../../interfaces/customer.interface';
import { Tutor } from '../../interfaces/tutor.interface';
import { ClaimType } from '../../interfaces/claim-type.interface';
import { DocumentType } from '../../interfaces/document-type.interface';
import { ConsumptionType } from '../../interfaces/consumption-type.interface';
import { Currency } from '../../interfaces/currency.interface';
import { ClaimForm } from '../../interfaces/claim-form.interface';

@Component({
  selector: 'app-form',
  imports: [ReactiveFormsModule, SkeletonBlockComponent, RouterLink],
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css']
})
export class FormComponent implements OnInit, OnDestroy {

  // --- CONSTANTES PRIVADAS - VALIDACIÓN

  private readonly MIN_DESC_LENGTH = 100;
  private readonly MIN_DETAIL_LENGTH = 50;
  private readonly PHONE_LENGTH = 9;
  private readonly MIN_ADDRESS_LENGTH = 25;
  private readonly MAX_FILE_SIZE = 153600; // 150KB
  private readonly recaptchaAction = 'claim_submit';

  private readonly namePattern = '^[a-zA-ZÀ-ÿ\u00f1\u00d1]+(\s*[a-zA-ZÀ-ÿ\u00f1\u00d1 ]*)*[a-zA-ZÀ-ÿ\u00f1\u00d1]+$';
  private readonly emailPattern = '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$';

  // --- CONSTANTES PRIVADAS - REGLAS DE DOCUMENTOS

  private readonly DOCUMENT_RULES: Record<string, { min: number; max: number; pattern: RegExp; hint: string }> = {
    'DNI': { min: 8, max: 8, pattern: /^[0-9]+$/, hint: 'DNI: exactamente 8 dígitos' },
    'CARNET DE EXTRANJERIA': { min: 9, max: 12, pattern: /^[0-9]+$/, hint: 'Carnet de Extranjería: 9 a 12 dígitos' },
    'PASAPORTE': { min: 6, max: 12, pattern: /^[A-Za-z0-9]+$/, hint: 'Pasaporte: 6 a 12 caracteres (letras y números)' },
    'RUC': { min: 11, max: 11, pattern: /^[0-9]+$/, hint: 'RUC: exactamente 11 dígitos' },
    'BREVETE': { min: 8, max: 8, pattern: /^[0-9]+$/, hint: 'Brevete: exactamente 8 dígitos' },
  };

  private readonly ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  // --- PROPIEDADES PÚBLICAS - INFORMACIÓN DEL TENANT

  public tenant = this.tenantService.tenant;
  public currentYear = new Date().getFullYear();

  // --- PROPIEDADES PÚBLICAS - ESTADO DE CARGA

  public isDataReady = false;

  // --- PROPIEDADES PÚBLICAS - DATOS CARGADOS

  public documentTypes: DocumentType[] = [];
  public consumptionTypes: ConsumptionType[] = [];
  public claimTypes: ClaimType[] = [];
  public currencies: Currency[] = [];

  // --- PROPIEDADES PÚBLICAS - CONFIGURACIÓN DE PASOS

  readonly totalSteps = 4;
  public currentStep = 1;
  public progressWidth = (1 / this.totalSteps) * 100;
  public progressIndicatorPosition = ((this.currentStep - 0.5) / this.totalSteps) * 100;

  readonly stepLabels = [
    'Datos Personales',
    'Tipo de Consumo',
    'Detalles del Reclamo',
    'Revisión Final'
  ];

  // --- PROPIEDADES PÚBLICAS - FORMULARIO TIPADO

  public claimForm: FormGroup<ClaimForm> = this.fb.group<ClaimForm>({
    document_type_id: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    document_number: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    first_name: this.fb.control('', { validators: [Validators.required, Validators.pattern(this.namePattern)], nonNullable: true }),
    last_name: this.fb.control('', { validators: [Validators.required, Validators.pattern(this.namePattern)], nonNullable: true }),
    celphone: this.fb.control('', { validators: [Validators.required, Validators.minLength(this.PHONE_LENGTH), Validators.maxLength(this.PHONE_LENGTH), Validators.pattern('[0-9]+')], nonNullable: true }),
    email: this.fb.control('', { validators: [Validators.required, Validators.email, Validators.pattern(this.emailPattern)], nonNullable: true }),
    address: this.fb.control('', { validators: [Validators.required, Validators.minLength(this.MIN_ADDRESS_LENGTH)], nonNullable: true }),
    is_younger: this.fb.control(false, { nonNullable: true }),
    document_type_tutor_id: this.fb.control('', { nonNullable: true }),
    document_number_tutor: this.fb.control('', { nonNullable: true }),
    first_name_tutor: this.fb.control('', { validators: [Validators.pattern(this.namePattern)], nonNullable: true }),
    last_name_tutor: this.fb.control('', { validators: [Validators.pattern(this.namePattern)], nonNullable: true }),
    celphone_tutor: this.fb.control('', { validators: [Validators.minLength(this.PHONE_LENGTH), Validators.maxLength(this.PHONE_LENGTH), Validators.pattern('[0-9]+')], nonNullable: true }),
    email_tutor: this.fb.control('', { validators: [Validators.email, Validators.pattern(this.emailPattern)], nonNullable: true }),
    claim_type_id: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    order_number: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    claimed_amount: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    currency_id: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    description: this.fb.control('', { validators: [Validators.required, Validators.minLength(this.MIN_DESC_LENGTH)], nonNullable: true }),
    consumption_type_id: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    detail: this.fb.control('', { validators: [Validators.required, Validators.minLength(this.MIN_DETAIL_LENGTH)], nonNullable: true }),
    request: this.fb.control('', { validators: [Validators.required, Validators.minLength(this.MIN_DESC_LENGTH)], nonNullable: true }),
    attachment: this.fb.control<File | null>(null),
    recaptcha: this.fb.control('', { nonNullable: true })
  });

  // --- PROPIEDADES PÚBLICAS - ESTADO DEL CLIENTE

  public customerAutoFilled = false;
  public tutorAutoFilled = false;
  public isSubmitting = false;

  // --- PROPIEDADES PÚBLICAS - MENSAJES Y ARCHIVOS

  public docNumberHint = 'Ingresa tu número de documento';
  public tutorDocNumberHint = 'Ingresa el número de documento del tutor';
  public selectedFileName: string | null = null;

  // --- PROPIEDADES PRIVADAS - SUSCRIPCIONES Y ESTADO INTERNO

  private readonly destroy$ = new Subject<void>();
  private attachedFile: File | null = null;
  private lastCustomerDocLoaded: string | null = null;
  private lastTutorDocLoaded: string | null = null;

  // --- CONSTRUCTOR

  constructor(
    private fb: FormBuilder,
    private claimsService: ClaimsService,
    private toast: ToastService,
    private tenantService: TenantService,
    private recaptchaService: RecaptchaService
  ) { }

  // --- CICLO DE VIDA - ANGULAR LIFECYCLE HOOKS

  ngOnInit(): void {
    this.loadInitialData();
    this.setupYoungerValidation();
    this.setupCustomerLookupByDocument();
    this.setupTutorLookupByDocument();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- MÉTODOS PÚBLICOS - GETTERS Y UTILIDAD

  /**
   * Obtiene la etiqueta del paso actual
   */
  public getCurrentStepLabel(): string {
    return this.stepLabels[this.currentStep - 1] || '';
  }

  /**
   * Obtiene el símbolo de moneda según la seleccionada
   */
  public getCurrencySymbol(): string {
    const currencyId = this.claimForm.controls.currency_id.value;
    const currency = this.currencies.find(c => Number(c.id) === Number(currencyId));
    return currency ? currency.symbol : '';
  }

  // --- MÉTODOS PÚBLICOS - VALIDACIÓN DE CAMPOS

  /**
   * Valida si un campo es válido y ha sido tocado
   */
  public isValidField(field: string): boolean | null {
    const control = this.claimForm.get(field);
    return !!(control?.valid && control?.touched) || null;
  }

  /**
   * Determina si un campo es inválido y ha sido tocado
   */
  public isFieldInvalid(field: string): boolean {
    const control = this.claimForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  /**
   * Determina si un campo es válido y ha sido tocado
   */
  public isFieldValid(field: string): boolean {
    const control = this.claimForm.get(field);
    return !!(control?.valid && control?.touched);
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  public getFieldError(field: string): string {
    const control = this.claimForm.get(field);
    if (!control?.errors) return '';

    const errors = control.errors;
    const errorKey = Object.keys(errors)[0];

    return this.buildErrorMessage(field, errorKey, errors);
  }

  // --- MÉTODOS PÚBLICOS - NAVEGACIÓN Y PASOS

  /**
   * Verifica si todos los campos del paso actual son válidos
   */
  public isStepValid(step: number): boolean {
    const controls = this.getStepControls(step);
    return controls.every(name => this.claimForm.get(name)?.valid);
  }

  /**
   * Verifica si es posible navegar a un paso específico
   */
  public canNavigateTo(step: number): boolean {
    if (step <= this.currentStep) return true;
    return this.allStepsValidUpTo(step);
  }

  /**
   * Navega a un paso específico si es permitido
   */
  public onStepClick(step: number): void {
    if (step === this.currentStep) return;
    if (!this.canNavigateTo(step)) {
      this.toast.showWarning('Por favor completa los pasos anteriores primero');
      return;
    }
    this.currentStep = step;
    this.updateProgressAndVisibility();
  }

  /**
   * Avanza al siguiente paso si todos los campos del paso actual son válidos
   */
  public goNextIfValid(step: number): void {
    if (this.isStepValid(step)) {
      this.nextStep();
    } else {
      this.markStepFieldsTouched(step);
      this.toast.showWarning('Revisa los campos incompletos o incorrectos');
    }
  }

  /**
   * Avanza al siguiente paso
   */
  public nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateProgressAndVisibility();
    }
  }

  /**
   * Retrocede al paso anterior
   */
  public prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateProgressAndVisibility();
    }
  }

  /**
   * Actualiza el progreso en dirección especificada
   */
  public updateProgress(direction: 'next' | 'prev'): void {
    if (direction === 'next' && this.currentStep < this.totalSteps) {
      this.currentStep++;
    } else if (direction === 'prev' && this.currentStep > 1) {
      this.currentStep--;
    }
    this.updateProgressAndVisibility();
  }

  // --- MÉTODOS PÚBLICOS - ESTADO DEL CLIENTE

  /**
   * Marca si el cliente es menor de edad y actualiza los validadores correspondientes
   */
  public isYounger(value: boolean): void {
    this.claimForm.controls.is_younger.setValue(value, { emitEvent: true });
  }

  // --- MÉTODOS PÚBLICOS - GESTIÓN DE ARCHIVOS

  /**
   * Procesa un archivo seleccionado por el usuario
   */
  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];

    if (file) {
      if (!this.validateFile(file)) {
        input.value = '';
        return;
      }
      this.selectedFileName = file.name;
      this.attachedFile = file;
      this.claimForm.controls.attachment.setValue(file);
    } else {
      this.clearFileSelection(input);
    }
  }

  /**
   * Elimina el archivo adjunto seleccionado
   */
  public removeAttachment(): void {
    this.selectedFileName = null;
    this.attachedFile = null;
    this.claimForm.controls.attachment.setValue(null);
  }

  // --- MÉTODOS PÚBLICOS - ENVÍO DE FORMULARIO

  /**
   * Maneja el evento de guardar/enviar el reclamo
   * Valida reCAPTCHA, valida el formulario y envía el reclamo
   */
  public async onSave(): Promise<void> {
    try {
      this.isSubmitting = true;
      const recaptchaToken = await this.executeRecaptchaWithFallback();

      if (!recaptchaToken) {
        this.isSubmitting = false;
        this.toast.showError('No pudimos validar reCAPTCHA. Intenta de nuevo.');
        return;
      }

      this.claimForm.controls.recaptcha.setValue(recaptchaToken);
      if (this.claimForm.invalid) {
        this.claimForm.markAllAsTouched();
        this.isSubmitting = false;
        return;
      }
      await this.submitClaim();
    } catch (error) {
      this.toast.showError('No pudimos enviar tu reclamo. Intenta nuevamente.');
    } finally {
      this.isSubmitting = false;
    }
  }

  // --- MÉTODOS PRIVADOS - INICIALIZACIÓN

  private loadInitialData(): void {
    forkJoin({
      documentTypes: this.claimsService.getDocumentTypes(),
      consumptionTypes: this.claimsService.getConsumptionTypes(),
      claimTypes: this.claimsService.getClaimTypes(),
      currencies: this.claimsService.getCurrencies()
    }).subscribe({
      next: (data) => {
        this.documentTypes = data.documentTypes;
        this.consumptionTypes = data.consumptionTypes;
        this.claimTypes = data.claimTypes;
        this.currencies = data.currencies;
        this.setupDocumentTypeValidation();
        this.isDataReady = true;
      },
      error: (error: any) => {
        this.isDataReady = true;
      }
    });
  }

  private setupDocumentTypeValidation(): void {
    this.claimForm.controls.document_type_id.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((typeId) => {
        if (!typeId) return;
        this.applyDocumentValidators('document_type_id', 'document_number', 'docNumberHint', true, Number(typeId));
        this.resetCustomerFields();
      });

    this.claimForm.controls.document_type_tutor_id.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((typeId) => {
        if (!this.claimForm.controls.is_younger.value || !typeId) return;
        this.applyDocumentValidators('document_type_tutor_id', 'document_number_tutor', 'tutorDocNumberHint', true, Number(typeId));
        this.resetTutorFields();
      });
  }

  private setupYoungerValidation(): void {
    this.claimForm.controls.is_younger.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((isYounger: boolean) => {
        if (isYounger) {
          this.enableTutorValidators();
        } else {
          this.disableTutorValidators();
        }
        this.claimForm.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      });
  }

  private setupCustomerLookupByDocument(): void {
    this.claimForm.controls.document_number.valueChanges.pipe(
      debounceTime(600),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe((docNumber) => {
      this.performCustomerLookup(docNumber);
    });
  }

  private setupTutorLookupByDocument(): void {
    this.claimForm.controls.document_number_tutor.valueChanges.pipe(
      debounceTime(600),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe((docNumber) => {
      if (this.claimForm.controls.is_younger.value) {
        this.performTutorLookup(docNumber);
      }
    });
  }

  // --- MÉTODOS PRIVADOS - VALIDACIÓN DE DOCUMENTOS

  private getDocRuleByTypeControl(typeControlName: string, typeIdOverride?: number) {
    const typeId = typeIdOverride !== undefined ? typeIdOverride : this.claimForm.get(typeControlName)?.value;

    if (!typeId) {
      return { min: 6, max: 20, pattern: /^[A-Za-z0-9]+$/, hint: 'Selecciona primero un tipo de documento' };
    }

    const numericTypeId = Number(typeId);
    const docType = this.documentTypes.find(t => Number(t.id) === numericTypeId);

    if (!docType) {
      return { min: 6, max: 20, pattern: /^[A-Za-z0-9]+$/, hint: 'Selecciona primero un tipo de documento' };
    }

    const typeName = docType.name.trim().toUpperCase();
    return this.DOCUMENT_RULES[typeName] || { min: 6, max: 20, pattern: /^[A-Za-z0-9]+$/, hint: 'Número de documento' };
  }

  private applyDocumentValidators(typeControlName: string, numberControlName: string, hintField: 'docNumberHint' | 'tutorDocNumberHint', isRequired: boolean, typeIdOverride?: number): void {
    const rule = this.getDocRuleByTypeControl(typeControlName, typeIdOverride);
    const control = this.claimForm.get(numberControlName);
    if (!control) return;

    const validators: any[] = [];
    if (isRequired) validators.push(Validators.required);
    validators.push(Validators.minLength(rule.min), Validators.maxLength(rule.max), Validators.pattern(rule.pattern));

    control.setValidators(validators);
    control.updateValueAndValidity({ emitEvent: false });

    if (hintField === 'docNumberHint') this.docNumberHint = rule.hint;
    if (hintField === 'tutorDocNumberHint') this.tutorDocNumberHint = rule.hint;
  }

  // --- MÉTODOS PRIVADOS - PASOS Y TUTORES

  private getStepControls(step: number): string[] {
    const baseCustomer = ['document_type_id', 'document_number', 'first_name', 'last_name', 'celphone', 'email', 'address'];
    const tutorFields = ['document_type_tutor_id', 'document_number_tutor', 'first_name_tutor', 'last_name_tutor', 'celphone_tutor', 'email_tutor'];
    const consumptionFields = ['consumption_type_id', 'order_number', 'claimed_amount', 'currency_id', 'description'];
    const claimFields = ['claim_type_id', 'detail', 'request'];

    switch (step) {
      case 1:
        return this.claimForm.controls.is_younger.value ? [...baseCustomer, ...tutorFields] : baseCustomer;
      case 2:
        return consumptionFields;
      case 3:
        return claimFields;
      default:
        return [];
    }
  }

  private allStepsValidUpTo(step: number): boolean {
    for (let i = 1; i < step; i++) {
      if (!this.isStepValid(i)) return false;
    }
    return true;
  }

  private enableTutorValidators(): void {
    const phoneLen = this.PHONE_LENGTH;
    const setValidators = (field: string, validators: any[]) => {
      const control = this.claimForm.get(field);
      if (control) {
        control.setValidators(validators);
        control.updateValueAndValidity();
      }
    };

    setValidators('document_type_tutor_id', [Validators.required]);
    this.applyDocumentValidators('document_type_tutor_id', 'document_number_tutor', 'tutorDocNumberHint', true);
    setValidators('first_name_tutor', [Validators.required, Validators.pattern(this.namePattern)]);
    setValidators('last_name_tutor', [Validators.required, Validators.pattern(this.namePattern)]);
    setValidators('celphone_tutor', [Validators.required, Validators.minLength(phoneLen), Validators.maxLength(phoneLen), Validators.pattern('[0-9]+')]);
    setValidators('email_tutor', [Validators.required, Validators.email, Validators.pattern(this.emailPattern)]);
  }

  private disableTutorValidators(): void {
    const tutorFields = ['document_type_tutor_id', 'document_number_tutor', 'first_name_tutor', 'last_name_tutor', 'celphone_tutor', 'email_tutor'];
    tutorFields.forEach(field => {
      const control = this.claimForm.get(field);
      if (control) {
        control.clearValidators();
        control.reset('');
        control.updateValueAndValidity();
      }
    });
  }

  private markStepFieldsTouched(step: number): void {
    this.getStepControls(step).forEach(name => this.claimForm.get(name)?.markAsTouched());
  }

  // --- MÉTODOS PRIVADOS - AUTOCOMPLETADO

  private performCustomerLookup(docNumber: string): void {
    const value = String(docNumber || '').trim();
    if (!value || this.lastCustomerDocLoaded === value) return;

    const rule = this.getDocRuleByTypeControl('document_type_id');
    const isValidFormat = value.length >= rule.min && value.length <= rule.max && rule.pattern.test(value) && /^[0-9]+$/.test(value);

    if (isValidFormat) {
      this.claimsService.getCustomerByDocument(this.tenantService.tenantSlug(), value).subscribe({
        next: (customer) => this.populateCustomerForm(customer),
        error: (err: any) => {
          if (err?.status !== 404) {
            this.toast.showWarning('No pudimos cargar los datos del cliente');
          }
        }
      });
    }
  }

  private performTutorLookup(docNumber: string): void {
    const value = String(docNumber || '').trim();
    if (!value || this.lastTutorDocLoaded === value) return;

    const rule = this.getDocRuleByTypeControl('document_type_tutor_id');
    const isValidFormat = value.length >= rule.min && value.length <= rule.max && rule.pattern.test(value) && /^[0-9]+$/.test(value);

    if (isValidFormat) {
      this.claimsService.getTutorByDocument(this.tenantService.tenantSlug(), value).subscribe({
        next: (tutor) => this.populateTutorForm(tutor),
        error: (err: any) => {
          if (err?.status !== 404) {
            this.toast.showWarning('No pudimos cargar los datos del tutor');
          }
        }
      });
    }
  }

  private populateCustomerForm(customer: Customer): void {
    this.claimForm.patchValue({
      document_type_id: String(customer.document_type_id),
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      celphone: customer.phone,
      address: customer.address,
      is_younger: customer.is_younger ?? false,
    }, { emitEvent: false });
    this.lastCustomerDocLoaded = String(customer.document_number);
    this.customerAutoFilled = true;
    this.toast.showSuccess('Cliente encontrado. Datos cargados automáticamente');
  }

  private populateTutorForm(tutor: Tutor): void {
    this.claimForm.patchValue({
      document_type_tutor_id: String(tutor.document_type_id),
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

  private resetCustomerFields(): void {
    this.claimForm.patchValue({
      document_number: '',
      first_name: '',
      last_name: '',
      email: '',
      celphone: '',
      address: '',
      is_younger: false,
      document_type_tutor_id: '',
      document_number_tutor: '',
      first_name_tutor: '',
      last_name_tutor: '',
      email_tutor: '',
      celphone_tutor: ''
    }, { emitEvent: false });
    this.lastCustomerDocLoaded = null;
    this.customerAutoFilled = false;
    this.tutorAutoFilled = false;
  }

  private resetTutorFields(): void {
    this.claimForm.patchValue({
      document_number_tutor: '',
      first_name_tutor: '',
      last_name_tutor: '',
      email_tutor: '',
      celphone_tutor: ''
    }, { emitEvent: false });
    this.lastTutorDocLoaded = null;
    this.tutorAutoFilled = false;
  }

  // --- MÉTODOS PRIVADOS - ARCHIVO

  private validateFile(file: File): boolean {
    if (file.size > this.MAX_FILE_SIZE) {
      this.toast.showWarning('El archivo es demasiado pesado. Máximo permitido: 150KB');
      return false;
    }

    if (!this.ALLOWED_FILE_TYPES.includes(file.type)) {
      this.toast.showWarning('Solo aceptamos archivos en formato PDF, DOC o DOCX');
      return false;
    }

    return true;
  }

  private clearFileSelection(input: HTMLInputElement | null): void {
    this.selectedFileName = null;
    this.attachedFile = null;
    if (input) input.value = '';
  }

  // --- MÉTODOS PRIVADOS - ENVÍO

  private async submitClaim(): Promise<void> {
    try {
      const customerData = this.buildCustomerData();
      const customerObservable = this.getOrCreateCustomer(customerData);

      if (this.claimForm.controls.is_younger.value) {
        const tutorData = this.buildTutorData();
        const tutorObservable = this.getOrCreateTutor(tutorData);
        const result = await firstValueFrom(this.submitWithTutor(customerObservable, tutorObservable));
      } else {
        const result = await firstValueFrom(this.submitWithoutTutor(customerObservable));
      }
    } catch (error) {
      throw error;
    }
  }

  private buildCustomerData(): Customer {
    return {
      document_type_id: Number(this.claimForm.controls.document_type_id.value),
      document_number: String(this.claimForm.controls.document_number.value || '').trim(),
      first_name: this.claimForm.controls.first_name.value,
      last_name: this.claimForm.controls.last_name.value,
      email: this.claimForm.controls.email.value,
      phone: this.claimForm.controls.celphone.value,
      address: this.claimForm.controls.address.value,
      is_younger: this.claimForm.controls.is_younger.value
    };
  }

  private buildTutorData(): Tutor {
    return {
      document_type_id: Number(this.claimForm.controls.document_type_tutor_id.value),
      document_number: String(this.claimForm.controls.document_number_tutor.value || '').trim(),
      first_name: this.claimForm.controls.first_name_tutor.value,
      last_name: this.claimForm.controls.last_name_tutor.value,
      email: this.claimForm.controls.email_tutor.value,
      phone: this.claimForm.controls.celphone_tutor.value
    };
  }

  private getOrCreateCustomer(customerData: Customer) {
    return this.claimsService.getCustomerByDocument(this.tenantService.tenantSlug(), customerData.document_number as string).pipe(
      catchError((err: any) => err?.status === 404 ? of(null) : throwError(() => err)),
      switchMap((found) => found && found.id ? of(found) : this.claimsService.createCustomer(this.tenantService.tenantSlug(), customerData))
    );
  }

  private getOrCreateTutor(tutorData: Tutor) {
    return this.claimsService.getTutorByDocument(this.tenantService.tenantSlug(), String(tutorData.document_number)).pipe(
      catchError((err: any) => err?.status === 404 ? of(null) : throwError(() => err)),
      switchMap((found) => found && (found as any).id ? of(found) : this.claimsService.createTutor(this.tenantService.tenantSlug(), tutorData))
    );
  }

  private submitWithTutor(customerObservable: any, tutorObservable: any) {
    return forkJoin({ customer: customerObservable, tutor: tutorObservable }).pipe(
      switchMap(({ customer, tutor }) => {
        const claimData = this.buildClaimPayload({
          customer_id: this.extractId(customer),
          tutor_id: this.extractId(tutor)
        });
        return this.createClaim(claimData);
      }),
      tap((response: any) => {
        this.toast.showSuccess((response as any)?.message || 'Tu reclamo fue enviado correctamente');
        this.resetForm();
      }),
      catchError((error: any) => {
        this.handleErrorToast(error, 'Hubo un problema al procesar tu reclamo');
        return throwError(() => error);
      })
    );
  }

  private submitWithoutTutor(customerObservable: any) {
    return customerObservable.pipe(
      switchMap(customer => {
        const claimData = this.buildClaimPayload({ customer_id: this.extractId(customer) });
        return this.createClaim(claimData);
      }),
      tap((response: any) => {
        this.toast.showSuccess((response as any)?.message || 'Tu reclamo fue enviado correctamente');
        this.resetForm();
      }),
      catchError((error: any) => {
        this.handleErrorToast(error, 'Hubo un problema al procesar tu reclamo');
        return throwError(() => error);
      })
    );
  }

  // --- MÉTODOS PRIVADOS - UTILIDAD

  private updateProgressAndVisibility(): void {
    this.progressWidth = (this.currentStep / this.totalSteps) * 100;
    this.progressIndicatorPosition = ((this.currentStep - 0.5) / this.totalSteps) * 100;
  }

  private buildErrorMessage(field: string, errorKey: string, errors: Record<string, any>): string {
    if (field === 'document_number' || field === 'document_number_tutor') {
      const typeControlName = field === 'document_number' ? 'document_type_id' : 'document_type_tutor_id';
      const rule = this.getDocRuleByTypeControl(typeControlName);
      return { required: 'Este campo es obligatorio', minlength: rule.hint, maxlength: rule.hint, pattern: rule.hint }[errorKey] || 'Por favor verifica este campo';
    }

    const fieldMessages: { [key: string]: { [error: string]: string } } = {
      celphone: {
        minlength: 'El número de celular debe tener 9 dígitos',
        maxlength: 'El número de celular debe tener 9 dígitos',
        pattern: 'Por favor ingresa solo números'
      },
      email: {
        email: 'Por favor ingresa un correo electrónico válido (ejemplo: usuario@dominio.com)',
        pattern: 'Por favor ingresa un correo electrónico válido'
      },
      first_name: { pattern: 'El nombre solo puede contener letras y espacios' },
      last_name: { pattern: 'Los apellidos solo pueden contener letras y espacios' },
      address: { minlength: 'Por favor proporciona una dirección más completa (mínimo 25 caracteres)' },
      description: { minlength: 'Por favor describe tu caso con más detalle (mínimo 100 caracteres)' },
      detail: { minlength: 'Por favor explica el detalle de tu reclamo (mínimo 50 caracteres)' },
      request: { minlength: 'Por favor indica claramente qué solicitas (mínimo 100 caracteres)' }
    };

    if (fieldMessages[field]?.[errorKey]) {
      return fieldMessages[field][errorKey];
    }

    const genericMessages: { [key: string]: string } = {
      required: 'Este campo es obligatorio',
      minlength: `Debe tener al menos ${errors['minlength']?.requiredLength} caracteres`,
      maxlength: `No puede exceder ${errors['maxlength']?.requiredLength} caracteres`,
      pattern: 'El formato ingresado no es válido',
      email: 'Por favor ingresa un correo electrónico válido'
    };

    return genericMessages[errorKey] || 'Por favor verifica este campo';
  }

  private handleErrorToast(error: any, fallback: string): void {
    try {
      const status = error?.['status'];
      const body = error?.['error'];
      if (status === 422 && body?.errors?.length) {
        this.toast.showError(`${body.errors[0].field}: ${body.errors[0].message}`);
      } else if ((status === 400 || status === 409 || status === 404) && body?.message) {
        this.toast.showError(body.message);
      } else {
        this.toast.showError(fallback);
      }
    } catch {
      this.toast.showError(fallback);
    }
  }

  private extractId(entity: any): number | undefined {
    return entity ? (entity.id ?? entity?.data?.id ?? entity?.customer?.id) : undefined;
  }

  private buildClaimPayload(base: { customer_id?: number; tutor_id?: number }): any {
    const fv = this.claimForm.getRawValue();
    return {
      customer_id: base.customer_id,
      tutor_id: base.tutor_id,
      claim_type_id: Number(fv.claim_type_id),
      consumption_type_id: Number(fv.consumption_type_id),
      currency_id: Number(fv.currency_id),
      order_number: Number(fv.order_number),
      claimed_amount: Number(fv.claimed_amount),
      description: fv.description,
      detail: fv.detail,
      request: fv.request,
      attachment: this.attachedFile,
      recaptcha: fv.recaptcha
    };
  }

  private createClaim(claimData: any) {
    const hasAttachment = claimData.attachment instanceof File;

    if (!hasAttachment) {
      // Use public endpoint (no authentication required)
      return this.claimsService.createPublicClaim(this.tenantService.tenantSlug(), this.buildFormDataPayload(claimData));
    }

    return this.claimsService.createPublicClaim(this.tenantService.tenantSlug(), this.buildFormDataPayload(claimData));
  }

  private buildJsonPayload(claimData: any) {
    return {
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
  }

  private buildFormDataPayload(claimData: any): FormData {
    const formData = new FormData();
    Object.entries(claimData).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (key === 'attachment' && value instanceof File) {
        formData.append('attachment', value);
      } else {
        formData.append(key, String(value));
      }
    });
    return formData;
  }

  private async executeRecaptchaWithFallback(): Promise<string> {
    try {
      const token = await this.executeRecaptcha();
      return token;
    } catch (error) {
      this.toast.showError('No pudimos validar reCAPTCHA. Intenta de nuevo.');
      this.isSubmitting = false;
      throw error;
    }
  }

  private async executeRecaptcha(): Promise<string> {
    try {
      const token = await this.recaptchaService.execute(this.recaptchaAction);
      return token;
    } catch (error) {
      throw error;
    }
  }

  private resetForm(): void {
    this.claimForm.reset({
      document_type_id: '',
      document_type_tutor_id: '',
      consumption_type_id: '',
      currency_id: '',
      claim_type_id: '',
      is_younger: false,
      attachment: null,
      recaptcha: ''
    });

    this.selectedFileName = null;
    this.attachedFile = null;
    this.currentStep = 1;
    this.updateProgressAndVisibility();
    this.lastCustomerDocLoaded = null;
    this.lastTutorDocLoaded = null;
    this.customerAutoFilled = false;
    this.tutorAutoFilled = false;
    this.claimForm.markAsPristine();
    this.claimForm.markAsUntouched();
  }
}
