// --- IMPORTS - ANGULAR
import { Component, ChangeDetectionStrategy, inject, DestroyRef, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// --- IMPORTS - RXJS
import { tap, catchError, firstValueFrom, forkJoin } from 'rxjs';

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
  styleUrls: ['./form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormComponent {

  // --- CONSTRUCTOR E INYECCIÓN (PRIMERO)
  private readonly fb = inject(FormBuilder);
  private readonly claimsService = inject(ClaimsService);
  private readonly toast = inject(ToastService);
  readonly tenantService = inject(TenantService);
  private readonly recaptchaService = inject(RecaptchaService);
  private readonly destroyRef = inject(DestroyRef);

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
  public isDataReady = signal(false);

  // --- PROPIEDADES PÚBLICAS - DATOS CARGADOS
  public documentTypes = signal<DocumentType[]>([]);
  public consumptionTypes = signal<ConsumptionType[]>([]);
  public claimTypes = signal<ClaimType[]>([]);
  public currencies = signal<Currency[]>([]);

  // --- PROPIEDADES PÚBLICAS - CONFIGURACIÓN DE PASOS
  readonly totalSteps = 4;
  public currentStep = signal(1);
  public progressWidth = computed(() => (this.currentStep() / this.totalSteps) * 100);
  public progressIndicatorPosition = computed(() => ((this.currentStep() - 0.5) / this.totalSteps) * 100);

  readonly stepLabels = [
    'Datos Personales',
    'Tipo de Consumo',
    'Detalles del Reclamo',
    'Revisión Final'
  ];

  // --- PROPIEDADES PÚBLICAS - FORMULARIO TIPADO
  public claimForm: FormGroup<ClaimForm> = this.initializeForm();

  // --- PROPIEDADES PÚBLICAS - ESTADO DEL CLIENTE
  public isSubmitting = signal(false);

  // --- PROPIEDADES PÚBLICAS - MENSAJES Y ARCHIVOS
  public docNumberHint = signal('Ingresa tu número de documento');
  public tutorDocNumberHint = signal('Ingresa el número de documento del tutor');
  public selectedFileName = signal<string | null>(null);

  // --- PROPIEDADES PRIVADAS - SUSCRIPCIONES Y ESTADO INTERNO
  private attachedFile = signal<File | null>(null);

  // --- MÉTODO PRIVADO - INICIALIZAR FORMULARIO
  private initializeForm(): FormGroup<ClaimForm> {
    return this.fb.group<ClaimForm>({
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
  }

  // --- CICLO DE VIDA - ANGULAR LIFECYCLE HOOKS
  constructor() {
    this.loadInitialData();
    this.setupYoungerValidation();
  }

  // --- MÉTODOS PÚBLICOS - GETTERS Y UTILIDAD

  /**
   * Obtiene la etiqueta del paso actual
   */
  public getCurrentStepLabel(): string {
    return this.stepLabels[this.currentStep() - 1] || '';
  }

  /**
   * Obtiene el símbolo de moneda según la seleccionada
   */
  public getCurrencySymbol(): string {
    const currencyId = this.claimForm.controls.currency_id.value;
    const currency = this.currencies().find(c => Number(c.id) === Number(currencyId));
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
    if (step <= this.currentStep()) return true;
    return this.allStepsValidUpTo(step);
  }

  /**
   * Navega a un paso específico si es permitido
   */
  public onStepClick(step: number): void {
    if (step === this.currentStep()) return;
    if (!this.canNavigateTo(step)) {
      this.toast.showWarning('Por favor completa los pasos anteriores primero');
      return;
    }
    this.currentStep.set(step);
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
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  /**
   * Retrocede al paso anterior
   */
  public prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  /**
   * Actualiza el progreso en dirección especificada
   */
  public updateProgress(direction: 'next' | 'prev'): void {
    if (direction === 'next' && this.currentStep() < this.totalSteps) {
      this.currentStep.set(this.currentStep() + 1);
    } else if (direction === 'prev' && this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
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
      this.selectedFileName.set(file.name);
      this.attachedFile.set(file);
      this.claimForm.controls.attachment.setValue(file);
    } else {
      this.clearFileSelection(input);
    }
  }

  /**
   * Elimina el archivo adjunto seleccionado
   */
  public removeAttachment(): void {
    this.selectedFileName.set(null);
    this.attachedFile.set(null);
    this.claimForm.controls.attachment.setValue(null);
  }

  // --- MÉTODOS PÚBLICOS - ENVÍO DE FORMULARIO

  /**
   * Maneja el evento de guardar/enviar el reclamo
   * Valida reCAPTCHA, valida el formulario y envía el reclamo
   */
  public async onSave(): Promise<void> {
    try {
      this.isSubmitting.set(true);

      const recaptchaToken = await this.executeRecaptchaWithFallback();

      if (!recaptchaToken) {
        this.isSubmitting.set(false);
        this.toast.showError('No pudimos validar reCAPTCHA. Intenta de nuevo.');
        return;
      }

      this.claimForm.controls.recaptcha.setValue(recaptchaToken);
      if (this.claimForm.invalid) {
        this.claimForm.markAllAsTouched();
        this.isSubmitting.set(false);
        return;
      }

      await this.submitClaim();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.toast.showError(`Error: ${errorMessage}`);
    } finally {
      this.isSubmitting.set(false);
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
      next: (data: any) => {
        this.documentTypes.set(data.documentTypes);
        this.consumptionTypes.set(data.consumptionTypes);
        this.claimTypes.set(data.claimTypes);
        this.currencies.set(data.currencies);
        this.setupDocumentTypeValidation();
        this.isDataReady.set(true);
      },
      error: (error: any) => {
        this.isDataReady.set(true);
      }
    });
  }

  private setupDocumentTypeValidation(): void {
    this.claimForm.controls.document_type_id.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((typeId) => {
        if (!typeId) return;
        this.applyDocumentValidators('document_type_id', 'document_number', 'docNumberHint', true, Number(typeId));
        this.resetCustomerFields();
      });

    this.claimForm.controls.document_type_tutor_id.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((typeId) => {
        if (!this.claimForm.controls.is_younger.value || !typeId) return;
        this.applyDocumentValidators('document_type_tutor_id', 'document_number_tutor', 'tutorDocNumberHint', true, Number(typeId));
        this.resetTutorFields();
      });
  }

  private setupYoungerValidation(): void {
    this.claimForm.controls.is_younger.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isYounger: any) => {
        if (isYounger) {
          this.enableTutorValidators();
        } else {
          this.disableTutorValidators();
        }
        this.claimForm.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      });
  }



  // --- MÉTODOS PRIVADOS - VALIDACIÓN DE DOCUMENTOS
  private getDocRuleByTypeControl(typeControlName: string, typeIdOverride?: number) {
    const typeId = typeIdOverride ?? this.claimForm.get(typeControlName)?.value;

    if (!typeId) {
      return { min: 6, max: 20, pattern: /^[A-Za-z0-9]+$/, hint: 'Selecciona primero un tipo de documento' };
    }

    const docType = this.documentTypes().find(t => Number(t.id) === Number(typeId));
    if (!docType) {
      return { min: 6, max: 20, pattern: /^[A-Za-z0-9]+$/, hint: 'Selecciona primero un tipo de documento' };
    }

    const typeName = docType.name.trim().toUpperCase();
    return this.DOCUMENT_RULES[typeName] ?? { min: 6, max: 20, pattern: /^[A-Za-z0-9]+$/, hint: 'Número de documento' };
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

    if (hintField === 'docNumberHint') this.docNumberHint.set(rule.hint);
    if (hintField === 'tutorDocNumberHint') this.tutorDocNumberHint.set(rule.hint);
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
  }

  private resetTutorFields(): void {
    this.claimForm.patchValue({
      document_number_tutor: '',
      first_name_tutor: '',
      last_name_tutor: '',
      email_tutor: '',
      celphone_tutor: ''
    }, { emitEvent: false });
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
    this.selectedFileName.set(null);
    this.attachedFile.set(null);
    if (input) input.value = '';
  }

  // --- MÉTODOS PRIVADOS - ENVÍO
  private async submitClaim(): Promise<void> {
    try {
      const publicPayload = this.buildPublicClaimPayload();

      const result$ = this.createClaim(publicPayload).pipe(
        tap((response: any) => {
          this.toast.showSuccess((response as any)?.message || 'Tu reclamo fue enviado correctamente');
          this.resetForm();
        }),
        catchError((error: any) => {
          this.handleErrorToast(error, 'Hubo un problema al procesar tu reclamo');
          throw error;
        })
      );

      await firstValueFrom(result$);
    } catch (error) {
      throw error;
    }
  }

  // --- MÉTODOS PRIVADOS - UTILIDAD
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

  private buildPublicClaimPayload(): any {
    const fv = this.claimForm.getRawValue();
    const payload: any = {
      document_type_id: Number(fv.document_type_id),
      document_number: String(fv.document_number || '').trim(),
      first_name: fv.first_name,
      last_name: fv.last_name,
      email: fv.email,
      celphone: fv.celphone,
      address: fv.address,
      is_younger: fv.is_younger,
      claim_type_id: Number(fv.claim_type_id),
      consumption_type_id: Number(fv.consumption_type_id),
      currency_id: Number(fv.currency_id),
      order_number: fv.order_number ? Number(fv.order_number) : undefined,
      claimed_amount: fv.claimed_amount ? Number(fv.claimed_amount) : undefined,
      description: fv.description,
      detail: fv.detail,
      request: fv.request,
      attachment: this.attachedFile(),
      recaptcha: fv.recaptcha
    };

    if (fv.is_younger) {
      payload.document_type_tutor_id = fv.document_type_tutor_id ? Number(fv.document_type_tutor_id) : undefined;
      payload.document_number_tutor = fv.document_number_tutor ? String(fv.document_number_tutor).trim() : undefined;
      payload.first_name_tutor = fv.first_name_tutor || undefined;
      payload.last_name_tutor = fv.last_name_tutor || undefined;
      payload.email_tutor = fv.email_tutor || undefined;
      payload.celphone_tutor = fv.celphone_tutor || undefined;
    }

    return payload;
  }

  private createClaim(claimData: any) {
    const formData = this.buildFormDataPayload(claimData);
    return this.claimsService.createPublicClaim(this.tenantService.tenantSlug(), formData);
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
      throw error;
    }
  }

  private async executeRecaptcha(): Promise<string> {
    try {
      const token = await this.recaptchaService.execute(this.recaptchaAction);
      if (!token) {
        throw new Error('reCAPTCHA no devolvió un token válido');
      }
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

    this.selectedFileName.set(null);
    this.attachedFile.set(null);
    this.currentStep.set(1);
    this.claimForm.markAsPristine();
    this.claimForm.markAsUntouched();
  }
}
