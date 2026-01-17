import { Component, ChangeDetectionStrategy, inject, DestroyRef, signal, HostListener, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, tap, catchError, Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

// --- SERVICES
import { ClaimsService } from '../../services/claims.service';
import { TenantService } from 'src/app/services/tenant.service';
import { RecaptchaService } from '../../services/recaptcha.service';
import { ToastService } from '../../shared/toast/toast.service';
import { LocationService } from '../../services/location.service';
import { PhoneCountryService } from '../../services/phone-country.service';
import { ComplaintBookService } from '../../services/complaint-book.service';

// --- INTERFACES
import { DocumentType } from '../../interfaces/document-type.interface';
import { ConsumptionType } from '../../interfaces/consumption-type.interface';
import { ClaimType } from '../../interfaces/claim-type.interface';
import { Currency } from '../../interfaces/currency.interface';
import { Location } from '../../interfaces/location.interface';
import { PhoneCountry } from '../../interfaces/phone-country.interface';
import { ComplaintBook } from '../../interfaces/complaint-book.interface';

// --- COMPONENTS
import { ComplaintsBookSkeletonComponent } from './complaints-book-skeleton.component';

@Component({
  selector: 'app-complaints-book',
  imports: [CommonModule, ReactiveFormsModule, ComplaintsBookSkeletonComponent],
  templateUrl: './complaints-book.component.html',
  styleUrl: './complaints-book.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComplaintsBookComponent {
  // --- INYECCIÓN DE DEPENDENCIAS
  private readonly fb = inject(FormBuilder);
  private readonly claimsService = inject(ClaimsService);
  private readonly toast = inject(ToastService);
  readonly tenantService = inject(TenantService);
  private readonly recaptchaService = inject(RecaptchaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locationService = inject(LocationService);

  // --- PROPIEDADES DEL FORMULARIO
  form!: FormGroup;
  trackForm!: FormGroup;

  // --- CONTROL DE TABS Y UI
  activeTab: 'create' | 'track' = 'create';
  isSubmitting = signal<boolean>(false);
  locationDropdownOpen = signal<boolean>(false);
  selectedLocation = signal<Location | null>(null);
  searchResults = signal<Location[]>([]);
  loadingLocations = signal<boolean>(false);
  locationSearchTerm = signal<string>('');

  // --- CONTROL DE DROPDOWNS DE DOCUMENTOS
  documentTypeDropdownOpen = signal<boolean>(false);
  tutorDocumentTypeDropdownOpen = signal<boolean>(false);
  legalRepDocumentTypeDropdownOpen = signal<boolean>(false);

  // --- CONTROL DE DROPDOWN DE PAÍS
  phoneCountryDropdownOpen = signal<boolean>(false);
  phoneCountrySearchTerm = signal<string>('');
  allPhoneCountries = signal<PhoneCountry[]>([]);
  filteredPhoneCountries = signal<PhoneCountry[]>([]);
  selectedPhoneCountry = signal<string>('');

  // --- LOGO Y TENANT
  readonly defaultLogo = 'assets/images/logos/logo-dark.png';
  readonly tenant = this.tenantService.tenant;

  // Computed signal para la ruta del logo (reactivo)
  companyLogoSrc = computed(() => this.tenant()?.logo_dark_url || this.defaultLogo);

  // --- DATOS CARGADOS DEL BACKEND
  public isDataReady = signal<boolean>(false);
  public documentTypes = signal<DocumentType[]>([]);
  public consumptionTypes = signal<ConsumptionType[]>([]);
  public claimTypes = signal<ClaimType[]>([]);
  public currencies = signal<Currency[]>([]);

  // --- CONSTANTES DE VALIDACIÓN
  private readonly MIN_DESC_LENGTH = 100; // description (backend: 100-3000)
  private readonly MAX_DESC_LENGTH = 3000;
  private readonly MIN_GOOD_DESC_LENGTH = 50; // detail (backend: 50-1000)
  private readonly MAX_GOOD_DESC_LENGTH = 1000;
  private readonly MIN_REQUEST_LENGTH = 50; // request (backend: 50-1000)
  private readonly MAX_REQUEST_LENGTH = 1000;
  private readonly MIN_ADDRESS_LENGTH = 15; // address (backend: 15-150)
  private readonly MAX_ADDRESS_LENGTH = 150;
  private readonly MAX_FILE_SIZE = 153600; // 150KB
  private readonly recaptchaAction = 'claim_submit';

  private readonly namePattern = "^[a-zA-ZÀ-ÿ\u00f1\u00d1]+([ .,'&()a-zA-ZÀ-ÿ\u00f1\u00d1]*)*$";
  private readonly companyNamePattern = "^[A-Za-zÀ-ÿ0-9 .,'&()\-]+$";
  private readonly emailPattern = '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$';

  // Validador personalizado para teléfono (9 dígitos permitiendo espacios)
  private phoneValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    const digits = control.value.replace(/\D/g, '');
    return digits.length === 9 ? null : { invalidPhone: true };
  };

  // --- REGLAS DE DOCUMENTOS
  private readonly DOCUMENT_RULES: Record<string, { min: number; max: number; pattern: RegExp; hint: string }> = {
    'DNI': { min: 8, max: 8, pattern: /^[0-9]+$/, hint: 'DNI: exactamente 8 dígitos' },
    'CARNET DE EXTRANJERIA': { min: 9, max: 12, pattern: /^[0-9]+$/, hint: 'Carnet de Extranjería: 9 a 12 dígitos' },
    'PASAPORTE': { min: 6, max: 12, pattern: /^[A-Za-z0-9]+$/, hint: 'Pasaporte: 6 a 12 caracteres (letras y números)' },
    'RUC': { min: 11, max: 11, pattern: /^[0-9]+$/, hint: 'RUC: exactamente 11 dígitos' },
    'BREVETE': { min: 8, max: 8, pattern: /^[0-9]+$/, hint: 'Brevete: exactamente 8 dígitos' },
  };

  private readonly ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  // --- PROPIEDADES PÚBLICAS - ESTADO
  public docNumberHint = signal<string>('Ingresa tu número de documento');
  public tutorDocNumberHint = signal<string>('Ingresa el número de documento del tutor');
  public selectedFiles = signal<File[]>([]);
  public uploadStatus = signal<'idle' | 'uploading' | 'success' | 'error'>('idle');

  // --- PROPIEDADES PRIVADAS - ESTADO INTERNO
  private readonly MAX_FILES = 5;
  private readonly locationSearchSubject = new Subject<string>();
  private readonly phoneCountrySearchSubject = new Subject<string>();

  // --- LIBRO DE RECLAMACIONES ACTIVO
  public activeComplaintBook = signal<ComplaintBook | null>(null);

  constructor(
    private phoneCountryService: PhoneCountryService,
    private complaintBookService: ComplaintBookService
  ) {
    this.form = this.createForm();
    this.trackForm = this.createTrackForm();
    this.setupLocationSearch();
    this.setupPhoneCountrySearch();
    this.setupValidationListeners();
    this.loadPhoneCountries();
    this.setupPhoneCountryEffect();

    // Detectar y cargar tenant del subdomain
    const tenantSlug = this.tenantService.detectTenantFromSubdomain();
    this.tenantService.loadTenant(tenantSlug);

    // Esperar a que el tenant esté listo antes de cargar datos iniciales
    effect(() => {
      const tenant = this.tenant();
      if (tenant) {
        this.loadInitialData();
      }
    }, { allowSignalWrites: true });
  }

  /**
   * Carga el libro de reclamaciones activo para el tenant y sucursal principal
   * (ruta pública - no requiere autenticación)
   */
  private loadActiveComplaintBook(): void {
    this.complaintBookService.getActiveComplaintBook()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (book) => {
          if (book) {
            this.activeComplaintBook.set(book);
          }
        },
        error: () => {
          // Fallar silenciosamente si el libro no existe
          this.activeComplaintBook.set(null);
        }
      });
  }

  // Computed para el código del libro activo
  complaintBookCode = computed(() => this.activeComplaintBook()?.code || '—');

  private loadPhoneCountries(): void {
    this.phoneCountryService.fetchPhoneCountries().subscribe({
      next: (countries) => {
        this.allPhoneCountries.set(countries);
        this.filteredPhoneCountries.set(countries);
        // Seleccionar Perú por defecto si existe
        const peru = countries.find(c => c.iso === 'PE');
        this.selectedPhoneCountry.set(peru ? peru.code : (countries[0]?.code || ''));
      },
      error: () => {
        this.filteredPhoneCountries.set([]);
      }
    });
  }

  private setupPhoneCountryEffect(): void {
    // Actualiza el dropdown reactivo si cambian los países
    effect(() => {
      const countries = this.allPhoneCountries();
      if (countries.length > 0 && this.filteredPhoneCountries().length === 0) {
        this.filteredPhoneCountries.set(countries);
      }
    });
  }

  // --- GLOBAL EVENT LISTENERS

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    // Cerrar dropdowns si se hace clic fuera de ellos
    if (!target.closest('[data-dropdown="documentType"]')) {
      this.documentTypeDropdownOpen.set(false);
    }
    if (!target.closest('[data-dropdown="tutorDocumentType"]')) {
      this.tutorDocumentTypeDropdownOpen.set(false);
    }
    if (!target.closest('[data-dropdown="legalRepDocumentType"]')) {
      this.legalRepDocumentTypeDropdownOpen.set(false);
    }
    if (!target.closest('[data-dropdown="phoneCountry"]')) {
      this.phoneCountryDropdownOpen.set(false);
    }
    if (!target.closest('[data-dropdown="location"]')) {
      this.closeLocationDropdown();
    }
  }

  // --- INICIALIZACIÓN DE FORMULARIOS

  /**
   * Crea el formulario principal con todos los controles
   */
  private createForm(): FormGroup {
    return this.fb.group({
      personType: ['natural'],
      documentType: ['', Validators.required],
      documentNumber: ['', Validators.required],
      firstName: ['', [Validators.required, Validators.pattern(this.namePattern)]],
      lastName: ['', [Validators.required, Validators.pattern(this.namePattern)]],
      minor: [false],
      tutorDocumentType: [''],
      tutorDocumentNumber: [''],
      tutorFirstName: ['', Validators.pattern(this.namePattern)],
      tutorLastName: ['', Validators.pattern(this.namePattern)],
      companyDocument: [''],
      companyName: ['', Validators.pattern(this.companyNamePattern)],
      legalRepDocumentType: [''],
      legalRepDocumentNumber: [''],
      legalRepFirstName: ['', Validators.pattern(this.namePattern)],
      legalRepLastName: ['', Validators.pattern(this.namePattern)],
      district: ['', [Validators.required, Validators.minLength(3)]],
      province: [''],
      department: [''],
      address: ['', [Validators.required, Validators.minLength(this.MIN_ADDRESS_LENGTH), Validators.maxLength(this.MAX_ADDRESS_LENGTH)]],
      email: ['', [Validators.required, Validators.email, Validators.pattern(this.emailPattern)]],
      phone: ['', [Validators.required, this.phoneValidator]],
      goodType: ['product'],
      goodDescription: ['', [Validators.required, Validators.minLength(this.MIN_GOOD_DESC_LENGTH), Validators.maxLength(this.MAX_GOOD_DESC_LENGTH)]],
      receipt: [false],
      receiptType: [''],
      receiptSeries: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(10)]],
      receiptNumber: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20)]],
      money: [false],
      currency: [''],
      claimAmount: [''],
      claimType: ['complaint'],
      claimDescription: ['', [Validators.required, Validators.minLength(this.MIN_DESC_LENGTH), Validators.maxLength(this.MAX_DESC_LENGTH)]],
      request: ['', [Validators.required, Validators.minLength(this.MIN_REQUEST_LENGTH), Validators.maxLength(this.MAX_REQUEST_LENGTH)]],
      attachments: [[]],
      recaptcha: [''],
      confirm: [false, Validators.requiredTrue]
    });
  }

  /**
   * Crea el formulario de seguimiento de reclamos
   */
  private createTrackForm(): FormGroup {
    return this.fb.group({
      code: ['', [
        Validators.required,
        Validators.pattern(/^(REC|QUE)-\d{4}-\d{6}$/)
      ]]
    });
  }

  /**
   * Carga los datos iniciales del backend
   */
  private loadInitialData(): void {
    forkJoin({
      documentTypes: this.claimsService.getDocumentTypes(),
      consumptionTypes: this.claimsService.getConsumptionTypes(),
      claimTypes: this.claimsService.getClaimTypes(),
      currencies: this.claimsService.getCurrencies()
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data: any) => {
        this.documentTypes.set(data.documentTypes);
        this.consumptionTypes.set(data.consumptionTypes);
        this.claimTypes.set(data.claimTypes);
        this.currencies.set(data.currencies);

        // Establecer valores por defecto para campos obligatorios
        if (data.consumptionTypes?.length > 0) {
          this.form.patchValue({ goodType: data.consumptionTypes[0].id });
        }
        if (data.claimTypes?.length > 0) {
          this.form.patchValue({ claimType: data.claimTypes[0].id });
        }

        // Cargar libro de reclamaciones solo después de datos iniciales
        this.loadActiveComplaintBook();

        this.isDataReady.set(true);
      },
      error: () => {
        this.isDataReady.set(true);
        this.toast.showError('No pudimos cargar los datos. Por favor recarga la página.');
      }
    });
  }

  /**
   * Configura los listeners de validación y cambios en formulario
   */
  private setupValidationListeners(): void {
    this.form.get('documentType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const docControl = this.form.get('documentNumber');
        if (docControl) {
          this.applyDocumentValidators('documentType', 'documentNumber', 'docNumberHint', true);
        }
      });

    this.form.get('minor')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isMinor: boolean) => {
        if (isMinor) {
          this.enableTutorValidators();
        } else {
          this.disableTutorValidators();
        }
      });

    this.form.get('personType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((personType: string) => {
        if (personType === 'legal') {
          this.enableLegalPersonValidators();
        } else {
          this.disableLegalPersonValidators();
        }
      });

    this.form.get('receipt')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((hasReceipt: boolean) => {
        if (hasReceipt) {
          this.enableReceiptValidators();
        } else {
          this.disableReceiptValidators();
        }
      });

    // Los campos de serie y número de comprobante son obligatorios para todos los tipos
    // No se requiere validación condicional

    this.form.get('money')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((hasMoney: boolean) => {
        if (hasMoney) {
          this.enableMoneyValidators();
        } else {
          this.disableMoneyValidators();
        }
      });

    this.form.get('tutorDocumentType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((typeId) => {
        if (!this.form.get('minor')?.value || !typeId) return;
        this.applyDocumentValidators('tutorDocumentType', 'tutorDocumentNumber', 'tutorDocNumberHint', true, Number(typeId));
      });

    this.form.get('legalRepDocumentType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((typeId) => {
        if (this.form.get('personType')?.value !== 'legal' || !typeId) return;
        this.applyDocumentValidators('legalRepDocumentType', 'legalRepDocumentNumber', 'docNumberHint', true, Number(typeId));
      });
  }

  // --- MÉTODOS PÚBLICOS - VALIDACIÓN DE CAMPOS

  /** Valida si un campo es inválido y ha sido tocado */
  public isFieldInvalid(field: string, form: FormGroup = this.form): boolean {
    const control = form.get(field);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }
  /** Valida si un campo es válido y ha sido tocado */
  public isFieldValid(field: string, form: FormGroup = this.form): boolean {
    const control = form.get(field);
    return !!(control && control.valid && (control.touched || control.dirty));
  }
  /** Obtiene el mensaje de error para un campo específico */
  public getFieldError(field: string, form: FormGroup = this.form): string {
    const control = form.get(field);
    if (!control || !control.errors) return '';
    const errorPriority = ['requiredTrue', 'required', 'minlength', 'maxlength', 'pattern', 'email'];
    const errorKey = errorPriority.find(key => control.errors?.[key]) || Object.keys(control.errors)[0];
    return this.buildErrorMessage(field, errorKey, control.errors);
  }
  /** Obtiene el mensaje de error para el formulario de seguimiento */
  public getTrackError(field: string): string {
    const control = this.trackForm.get(field);
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['pattern']) return 'Formato inválido. Usa REC-YYYY-###### o QUE-YYYY-######';
    return 'Por favor verifica este campo';
  }

  // --- MÉTODOS PÚBLICOS - CONTROL DE TABS

  /**
   * Cambia el tab activo
   */
  public setTab(tab: 'create' | 'track'): void {
    this.activeTab = tab;
  }

  // --- MÉTODOS PÚBLICOS - GESTIÓN DE ARCHIVOS

  /**
   * Procesa un archivo seleccionado por el usuario
   */
  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input?.files || []);

    if (files.length > 0) {
      this.addFiles(files, input);
    } else {
      this.clearFileSelection(input);
    }
  }

  /**
   * Procesa archivos arrastrados al dropzone
   */
  public onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.addFiles(files);
    }
  }

  /**
   * Añade archivos al array de seleccionados
   */
  private addFiles(files: File[], input?: HTMLInputElement): void {
    const currentFiles = this.selectedFiles();
    const maxRemaining = this.MAX_FILES - currentFiles.length;

    if (currentFiles.length >= this.MAX_FILES) {
      this.toast.showWarning(`Máximo ${this.MAX_FILES} archivos permitidos`);
      if (input) input.value = '';
      return;
    }

    const filesToAdd: File[] = [];

    for (const file of files) {
      if (filesToAdd.length >= maxRemaining) {
        this.toast.showWarning(`Solo puedes añadir ${maxRemaining} archivos más`);
        break;
      }

      if (!this.validateFile(file)) {
        continue;
      }

      // Evitar duplicados por nombre y tamaño
      const isDuplicate = currentFiles.some(f => f.name === file.name && f.size === file.size);
      if (isDuplicate) {
        this.toast.showWarning(`El archivo "${file.name}" ya está seleccionado`);
        continue;
      }

      filesToAdd.push(file);
    }

    if (filesToAdd.length > 0) {
      const updatedFiles = [...currentFiles, ...filesToAdd];
      this.selectedFiles.set(updatedFiles);
      (this.form.get('attachments') as FormControl)?.setValue(updatedFiles);
      this.uploadStatus.set('success');
      setTimeout(() => this.uploadStatus.set('idle'), 3000);
    }

    if (input) input.value = '';
  }

  /**
   * Elimina un archivo específico de la lista
   */
  public removeFile(index: number): void {
    const updatedFiles = this.selectedFiles().filter((_, i) => i !== index);
    this.selectedFiles.set(updatedFiles);
    (this.form.get('attachments') as FormControl)?.setValue(updatedFiles);
  }

  /**
   * Elimina todos los archivos adjuntos
   */
  public removeAllAttachments(): void {
    this.selectedFiles.set([]);
    (this.form.get('attachments') as FormControl)?.setValue([]);
  }

  /**
   * Formatea y valida el número de documento en tiempo real (unificado)
   */
  public onDocumentInput(event: Event, typeControl: 'documentType' | 'tutorDocumentType' | 'legalRepDocumentType', numberControl: string): void {
    const input = event.target as HTMLInputElement;
    const rules = this.getDocRuleByTypeControl(typeControl);
    if (!rules) return;
    let value = input.value.trim();
    const isNumericOnly = String(rules.pattern) === String(/^[0-9]+$/);
    value = isNumericOnly ? value.replace(/\D/g, '') : value.replace(/[^A-Za-z0-9]/g, '');
    value = value.substring(0, rules.max);
    input.value = value;
    (this.form.get(numberControl) as FormControl)?.setValue(value, { emitEvent: false });
  }

  /**
   * Limita el número de RUC a dígitos y 11 caracteres
   */
  public onCompanyDocumentInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) {
      value = value.substring(0, 11);
    }
    input.value = value;
    (this.form.get('companyDocument') as FormControl)?.setValue(value, { emitEvent: false });
  }

  /**
   * Formatea el número telefónico con espacios en tiempo real (XXX XXX XXX)
   */
  public onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Solo dígitos

    // Limitar a 9 dígitos
    value = value.substring(0, 9);

    // Formatear: XXX XXX XXX
    if (value.length > 0) {
      if (value.length <= 3) {
        value = value;
      } else if (value.length <= 6) {
        value = value.substring(0, 3) + ' ' + value.substring(3);
      } else {
        value = value.substring(0, 3) + ' ' + value.substring(3, 6) + ' ' + value.substring(6, 9);
      }
    }

    // Actualizar el control con el valor formateado
    (this.form.get('phone') as FormControl)?.setValue(value, { emitEvent: false });
  }

  // --- UBICACIONES INLINE ---

  /**
   * Configura el debounce para búsqueda de ubicaciones
   */
  private setupLocationSearch(): void {
    this.locationSearchSubject
      .pipe(
        debounceTime(400), // Espera 400ms después de que deje de escribir
        distinctUntilChanged(), // Solo busca si el término cambió
        switchMap((term) => {
          if (term.length === 0) {
            this.searchResults.set([]);
            this.loadingLocations.set(false);
            return of([]);
          }
          if (term.length < 3) {
            // Requiere al menos 3 caracteres para evitar ruido y ser más preciso
            this.searchResults.set([]);
            this.loadingLocations.set(false);
            return of([]);
          }
          this.loadingLocations.set(true);
          return this.locationService.getLocations({ search: term }).pipe(
            catchError(() => {
              this.loadingLocations.set(false);
              this.searchResults.set([]);
              return of([]); // Mantiene vivo el stream y permite reintentar
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results) => {
        const term = this.locationSearchTerm().toLowerCase();
        const ranked = results
          .map((location) => ({ location, score: this.scoreLocation(location, term) }))
          .sort((a, b) => (b.score - a.score) || a.location.displayName.localeCompare(b.location.displayName))
          .map((item) => item.location)
          .slice(0, 20);

        this.searchResults.set(ranked); // Limita resultados priorizando coincidencias más precisas
        this.loadingLocations.set(false);
      });
  }

  private scoreLocation(location: Location, rawTerm: string): number {
    if (!rawTerm) {
      return 0;
    }

    const term = rawTerm.toLowerCase();
    const district = location.district?.toLowerCase() || '';
    const province = location.province?.toLowerCase() || '';
    const department = location.department?.toLowerCase() || '';
    const displayName = location.displayName?.toLowerCase() || '';

    let score = 0;

    if (district === term) score += 100;
    else if (district.startsWith(term)) score += 80;
    else if (district.includes(term)) score += 60;

    if (province === term) score += 50;
    else if (province.startsWith(term)) score += 35;
    else if (province.includes(term)) score += 20;

    if (department === term) score += 30;
    else if (department.startsWith(term)) score += 15;

    if (displayName.includes(term)) score += 10;

    if (location.ubigeo?.startsWith(term)) score += 5;

    return score;
  }

  /**
   * Abre el dropdown de ubicaciones y carga datos si no existen
   */
  public openLocationDropdown(): void {
    this.locationDropdownOpen.set(true);
  }

  public closeLocationDropdown(): void {
    this.locationDropdownOpen.set(false);
    this.locationSearchTerm.set('');
    this.searchResults.set([]);
  }

  public onClearLocationSearch(): void {
    this.locationSearchTerm.set('');
    this.searchResults.set([]);
    this.loadingLocations.set(false);
  }

  public onLocationSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value.trim();
    this.locationSearchTerm.set(term);
    // Emite el término al Subject para que se procese con debounce
    this.locationSearchSubject.next(term);
  }

  public onDistrictSelect(location: Location): void {
    this.selectedLocation.set(location);
    this.form.get('district')?.setValue(location.district);
    this.form.get('province')?.setValue(location.province);
    this.form.get('department')?.setValue(location.department);
    this.closeLocationDropdown();
  }

  public getLocationDisplay(): string {
    const district = this.form.get('district')?.value;
    const province = this.form.get('province')?.value;
    const department = this.form.get('department')?.value;
    return [district, province, department].filter(Boolean).join(' / ');
  }

  // --- MÉTODOS PÚBLICOS - DROPDOWNS DE DOCUMENTO

  /** Unifica la gestión de dropdowns de tipo de documento */
  public toggleDropdown(dropdown: 'documentType' | 'tutorDocumentType' | 'legalRepDocumentType'): void {
    if (dropdown === 'documentType') this.documentTypeDropdownOpen.set(!this.documentTypeDropdownOpen());
    if (dropdown === 'tutorDocumentType') this.tutorDocumentTypeDropdownOpen.set(!this.tutorDocumentTypeDropdownOpen());
    if (dropdown === 'legalRepDocumentType') this.legalRepDocumentTypeDropdownOpen.set(!this.legalRepDocumentTypeDropdownOpen());
  }
  public getDocumentTypeName(typeId: any): string {
    const type = this.documentTypes().find(t => t.id === typeId);
    return type ? type.name : 'Seleccionar tipo de documento';
  }
  /** Unifica la selección de tipo de documento */
  public selectDocumentType(typeId: any, controlName: 'documentType' | 'tutorDocumentType' | 'legalRepDocumentType', numberControl: string, hintField: 'docNumberHint' | 'tutorDocNumberHint'): void {
    this.form.patchValue({ [controlName]: typeId });
    this.toggleDropdown(controlName);
    const control = this.form.get(numberControl);
    if (control) {
      control.reset();
      control.markAsUntouched();
    }
    const selectedType = this.documentTypes().find(t => t.id === typeId);
    if (selectedType && this.DOCUMENT_RULES[selectedType.name]) {
      this[hintField].set(this.DOCUMENT_RULES[selectedType.name].hint);
    }
  }

  // --- MÉTODOS PÚBLICOS - DROPDOWN DE PAÍS

  public togglePhoneCountryDropdown(): void {
    this.phoneCountryDropdownOpen.set(!this.phoneCountryDropdownOpen());
    if (this.phoneCountryDropdownOpen()) {
      this.filteredPhoneCountries.set(this.allPhoneCountries());
    }
  }

  public selectPhoneCountry(code: string): void {
    this.selectedPhoneCountry.set(code);
    this.phoneCountryDropdownOpen.set(false);
    this.phoneCountrySearchTerm.set('');
  }

  public onPhoneCountrySearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.phoneCountrySearchTerm.set(term);
    this.phoneCountrySearchSubject.next(term);
  }

  public onClearPhoneCountrySearch(): void {
    this.phoneCountrySearchTerm.set('');
    this.filteredPhoneCountries.set(this.allPhoneCountries());
  }

  private setupPhoneCountrySearch(): void {
    this.phoneCountrySearchSubject
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((term) => {
        const trimmed = term.trim();
        if (!trimmed) {
          this.filteredPhoneCountries.set(this.allPhoneCountries());
          return;
        }

        const ranked = this.allPhoneCountries()
          .map((country) => ({ country, score: this.scorePhoneCountry(country, trimmed) }))
          .filter((item) => item.score > 0)
          .sort((a, b) => (b.score - a.score) || a.country.name.localeCompare(b.country.name))
          .map((item) => item.country);

        this.filteredPhoneCountries.set(ranked.length ? ranked : []);
      });
  }

  private scorePhoneCountry(country: PhoneCountry, rawTerm: string): number {
    const term = rawTerm.toLowerCase();
    const name = country.name.toLowerCase();
    const code = country.code.toLowerCase();
    const iso = country.iso.toLowerCase();

    let score = 0;
    if (name === term) score += 100;
    else if (name.startsWith(term)) score += 70;
    else if (name.includes(term)) score += 40;

    if (code.startsWith(term)) score += 60;
    else if (code.includes(term)) score += 30;

    if (iso.startsWith(term)) score += 50;
    else if (iso.includes(term)) score += 20;

    return score;
  }

  // --- MÉTODOS PÚBLICOS - SUBMIT

  /**
   * Maneja el envío del formulario principal
   */
  public async onSubmit(): Promise<void> {
    try {
      this.isSubmitting.set(true);

      const recaptchaToken = await this.executeRecaptchaWithFallback();

      if (!recaptchaToken) {
        this.isSubmitting.set(false);
        this.toast.showError('No pudimos validar reCAPTCHA. Intenta de nuevo.');
        return;
      }

      (this.form.get('recaptcha') as FormControl)?.setValue(recaptchaToken);

      if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.scrollToFirstError();
        this.isSubmitting.set(false);
        this.toast.showWarning('Por favor completa todos los campos requeridos');
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

  /**
   * Desplaza suavemente al primer campo inválido y resalta
   */
  private scrollToFirstError(): void {
    const firstInvalid: HTMLElement | null = document.querySelector('.ng-invalid[formcontrolname]');
    if (!firstInvalid) return;

    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstInvalid.classList.add('field-error-highlight');

    // Quitar el resaltado después de la animación
    setTimeout(() => firstInvalid.classList.remove('field-error-highlight'), 1200);
  }

  /**
   * Maneja el envío del formulario de seguimiento
   */
  public onTrackSubmit(): void {
    if (this.trackForm.valid) {
      const code = this.trackForm.get('code')?.value || '';
      const slug = this.tenantService.tenantSlug();
      this.claimsService.getPublicClaimByCode(slug, code)
        .pipe(
          tap((result: any) => {
            const status = result?.resolved ? 'Resuelto' : 'En proceso';
            this.toast.showSuccess(`Código ${result?.code} — Estado: ${status}`);
          }),
          catchError((err: any) => {
            if (err?.status === 404) {
              this.toast.showWarning('No encontramos un reclamo con ese código');
            } else if (err?.status === 400) {
              this.toast.showWarning('El código no es válido. Ej: REC-2026-000001');
            } else {
              this.toast.showError('Error al consultar el reclamo');
            }
            throw err;
          })
        )
        .subscribe();
    } else {
      this.trackForm.markAllAsTouched();
      this.toast.showWarning('Por favor ingresa un código válido');
    }
  }

  // --- MÉTODOS PÚBLICOS - LOGO

  /**
   * Maneja el error al cargar el logo
   */
  public onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.defaultLogo;
  }

  /**
   * Obtiene el símbolo de moneda según la seleccionada
   */
  public getCurrencySymbol(): string {
    const currencyId = this.form.get('currency')?.value;
    const currency = this.currencies().find(c => Number(c.id) === Number(currencyId));
    return currency?.symbol ?? 'S/';
  }

  // --- MÉTODOS PRIVADOS - VALIDACIÓN DE DOCUMENTOS

  /**
   * Obtiene las reglas de validación para un tipo de documento
   */
  private getDocRuleByTypeControl(typeControlName: string, typeIdOverride?: number) {
    const typeId = typeIdOverride ?? this.form.get(typeControlName)?.value;

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

  /**
   * Aplica validadores de documento a un control
   */
  private applyDocumentValidators(typeControlName: string, numberControlName: string, hintField: 'docNumberHint' | 'tutorDocNumberHint', isRequired: boolean, typeIdOverride?: number): void {
    const rule = this.getDocRuleByTypeControl(typeControlName, typeIdOverride);
    const control = this.form.get(numberControlName);
    if (!control) return;

    const validators: any[] = [];
    if (isRequired) validators.push(Validators.required);
    validators.push(Validators.minLength(rule.min), Validators.maxLength(rule.max), Validators.pattern(rule.pattern));

    control.setValidators(validators);
    control.updateValueAndValidity({ emitEvent: false });

    if (hintField === 'docNumberHint') this.docNumberHint.set(rule.hint);
    if (hintField === 'tutorDocNumberHint') this.tutorDocNumberHint.set(rule.hint);
  }

  // --- MÉTODOS PRIVADOS - GESTIÓN DE TUTORES

  /**
   * Habilita los validadores para los campos del tutor
   */
  private enableTutorValidators(): void {
    const setValidators = (field: string, validators: any[]) => {
      const control = this.form.get(field);
      if (control) {
        control.setValidators(validators);
        control.updateValueAndValidity({ emitEvent: false });
      }
    };

    setValidators('tutorDocumentType', [Validators.required]);
    this.applyDocumentValidators('tutorDocumentType', 'tutorDocumentNumber', 'tutorDocNumberHint', true);
    setValidators('tutorFirstName', [Validators.required, Validators.pattern(this.namePattern)]);
    setValidators('tutorLastName', [Validators.required, Validators.pattern(this.namePattern)]);
    setValidators('tutorDocumentNumber', [Validators.required]);
  }

  /**
   * Deshabilita los validadores para los campos del tutor
   */
  private disableTutorValidators(): void {
    const tutorFields = ['tutorDocumentType', 'tutorDocumentNumber', 'tutorFirstName', 'tutorLastName'];
    tutorFields.forEach(field => {
      const control = this.form.get(field);
      if (control) {
        control.clearValidators();
        if (field === 'tutorFirstName' || field === 'tutorLastName') {
          control.setValidators(Validators.pattern(this.namePattern));
        }
        control.setValue('');
        control.updateValueAndValidity({ emitEvent: false });
        control.markAsUntouched();
      }
    });
  }

  /**
   * Habilita los validadores para persona jurídica
   * Nota: company_document es RUC (específico para Perú)
   * Si se expande a otros países, considerar agregar company_document_type
   */
  private enableLegalPersonValidators(): void {
    const setValidators = (field: string, validators: any[]) => {
      const control = this.form.get(field);
      if (control) {
        control.setValidators(validators);
        control.updateValueAndValidity({ emitEvent: false });
      }
    };

    // Deshabilitar validadores de persona natural
    const naturalFields = ['documentType', 'documentNumber', 'firstName', 'lastName'];
    naturalFields.forEach(field => {
      const control = this.form.get(field);
      if (control) {
        control.clearValidators();
        control.setValue('');
        control.updateValueAndValidity({ emitEvent: false });
        control.markAsUntouched();
      }
    });

    // Habilitar validadores de persona jurídica
    setValidators('companyDocument', [Validators.required, Validators.minLength(11), Validators.maxLength(11), Validators.pattern(/^[0-9]+$/)]);
    setValidators('companyName', [Validators.required, Validators.pattern(this.namePattern)]);
    setValidators('legalRepDocumentType', [Validators.required]);
    setValidators('legalRepDocumentNumber', [Validators.required]);
    setValidators('legalRepFirstName', [Validators.required, Validators.pattern(this.namePattern)]);
    setValidators('legalRepLastName', [Validators.required, Validators.pattern(this.namePattern)]);

    // Actualizar hint para representante legal si ya hay un tipo seleccionado
    const legalRepDocType = this.form.get('legalRepDocumentType')?.value;
    if (legalRepDocType) {
      this.applyDocumentValidators('legalRepDocumentType', 'legalRepDocumentNumber', 'docNumberHint', true, Number(legalRepDocType));
    }
  }

  /**
   * Deshabilita los validadores para persona jurídica
   */
  private disableLegalPersonValidators(): void {
    const legalFields = ['companyDocument', 'companyName', 'legalRepDocumentType', 'legalRepDocumentNumber', 'legalRepFirstName', 'legalRepLastName'];
    legalFields.forEach(field => {
      const control = this.form.get(field);
      if (control) {
        control.clearValidators();
        control.setValue('');
        control.updateValueAndValidity({ emitEvent: false });
        control.markAsUntouched();
      }
    });

    // Rehabilitar validadores de persona natural
    const setValidators = (field: string, validators: any[]) => {
      const control = this.form.get(field);
      if (control) {
        control.setValidators(validators);
        control.updateValueAndValidity({ emitEvent: false });
      }
    };

    setValidators('documentType', [Validators.required]);
    setValidators('documentNumber', [Validators.required]);
    setValidators('firstName', [Validators.required, Validators.pattern(this.namePattern)]);
    setValidators('lastName', [Validators.required, Validators.pattern(this.namePattern)]);
  }

  /**
   * Habilita los validadores para comprobante
   */
  private enableReceiptValidators(): void {
    const setValidators = (field: string, validators: any[]) => {
      const control = this.form.get(field);
      if (control) {
        control.setValidators(validators);
        control.updateValueAndValidity({ emitEvent: false });
      }
    };

    setValidators('receiptType', [Validators.required]);
    setValidators('receiptNumber', [Validators.required, Validators.minLength(1), Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9-]+$/)]);
  }

  /**
   * Deshabilita los validadores para comprobante
   */
  private disableReceiptValidators(): void {
    const receiptFields = ['receiptType', 'receiptNumber'];
    receiptFields.forEach(field => {
      const control = this.form.get(field);
      if (control) {
        control.clearValidators();
        control.setValue('');
        control.updateValueAndValidity({ emitEvent: false });
        control.markAsUntouched();
      }
    });
  }

  /**
   * Habilita los validadores para monto reclamado
   */
  private enableMoneyValidators(): void {
    const claimAmountControl = this.form.get('claimAmount');
    const currencyControl = this.form.get('currency');

    if (claimAmountControl) {
      claimAmountControl.setValidators([Validators.required, Validators.min(0.01), Validators.pattern(/^[0-9]+(\.[0-9]{1,2})?$/)]);
      claimAmountControl.updateValueAndValidity({ emitEvent: false });
    }

    if (currencyControl) {
      currencyControl.setValidators([Validators.required]);
      currencyControl.updateValueAndValidity({ emitEvent: false });
      // Establecer el primer currency por defecto si está disponible
      if (!currencyControl.value && this.currencies().length > 0) {
        (currencyControl as FormControl).setValue(this.currencies()[0].id);
      }
    }
  }

  /**
   * Deshabilita los validadores para monto reclamado
   */
  private disableMoneyValidators(): void {
    const claimAmountControl = this.form.get('claimAmount');
    const currencyControl = this.form.get('currency');

    if (claimAmountControl) {
      claimAmountControl.clearValidators();
      (claimAmountControl as FormControl).setValue('');
      claimAmountControl.updateValueAndValidity({ emitEvent: false });
      claimAmountControl.markAsUntouched();
    }

    if (currencyControl) {
      currencyControl.clearValidators();
      (currencyControl as FormControl).setValue('');
      currencyControl.updateValueAndValidity({ emitEvent: false });
      currencyControl.markAsUntouched();
    }
  }

  // --- MÉTODOS PRIVADOS - ARCHIVOS

  /**
   * Valida un archivo antes de adjuntarlo
   */
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

  /**
   * Limpia la selección de archivos
   */
  private clearFileSelection(input: HTMLInputElement | null): void {
    if (input) input.value = '';
  }

  // --- MÉTODOS PRIVADOS - ENVÍO Y PAYLOAD

  /**
   * Construye el payload del reclamo
   */
  private buildPublicClaimPayload(): FormData {
    const fv = this.form.getRawValue();
    const formData = new FormData();

    const payload: any = {
      person_type: fv.personType,
      is_younger: fv.minor,
      claim_type_id: Number(fv.claimType),
      consumption_type_id: Number(fv.goodType),
      description: fv.claimDescription, // descripción del reclamo (min 100, max 3000)
      detail: fv.goodDescription,      // detalle del bien/servicio (min 50, max 1000)
      request: fv.request,
      recaptcha: fv.recaptcha,
      email: fv.email,
      celphone: fv.phone,
      address: fv.address
    };
    // Agregar ubicación si está seleccionada
    const selectedLoc = this.selectedLocation();
    if (selectedLoc) {
      payload.location_id = selectedLoc.id;
      payload.district = selectedLoc.district;
      payload.province = selectedLoc.province;
      payload.department = selectedLoc.department;
    } else if (fv.district) {
      // Si hay texto de distrito pero no ubicación seleccionada, enviar igualmente para búsqueda server-side
      payload.district = fv.district;
    }

    // Datos específicos según tipo de persona
    if (fv.personType === 'natural') {
      payload.document_type_id = Number(fv.documentType);
      payload.document_number = String(fv.documentNumber || '').trim();
      payload.first_name = fv.firstName;
      payload.last_name = fv.lastName;
    } else if (fv.personType === 'legal') {
      payload.document_type_id = Number(fv.legalRepDocumentType);
      payload.document_number = String(fv.legalRepDocumentNumber || '').trim(); // DNI del representante
      payload.company_document = String(fv.companyDocument || '').trim(); // RUC de la empresa
      payload.first_name = fv.legalRepFirstName;
      payload.last_name = fv.legalRepLastName;
      payload.company_name = fv.companyName;
    }

    if (fv.receipt) {
      payload.receipt_type = fv.receiptType;
      payload.receipt_number = fv.receiptNumber;
    }

    if (fv.money && fv.claimAmount && fv.currency) {
      payload.claimed_amount = fv.claimAmount;
      payload.currency_id = Number(fv.currency);
    }

    if (fv.minor) {
      payload.document_type_id_tutor = Number(fv.tutorDocumentType);
      payload.document_number_tutor = String(fv.tutorDocumentNumber || '').trim();
      payload.first_name_tutor = fv.tutorFirstName;
      payload.last_name_tutor = fv.tutorLastName;
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });

    // Añadir múltiples archivos
    const files = this.selectedFiles();
    if (files.length > 0) {
      files.forEach((file, index) => {
        formData.append(`attachment`, file);
      });
    }

    return formData;
  }

  /**
   * Envía el reclamo al backend
   */
  private async submitClaim(): Promise<void> {
    try {
      const formData = this.buildPublicClaimPayload();
      const result$ = this.claimsService.createPublicClaim(this.tenantService.tenantSlug(), formData).pipe(
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

  /**
   * Reinicia el formulario
   */
  private resetForm(): void {
    this.form.reset();
    this.form.get('personType')?.setValue('natural');
    this.form.get('goodType')?.setValue(this.consumptionTypes()?.[0]?.id || '');
    this.form.get('claimType')?.setValue(this.claimTypes()?.[0]?.id || '');
    this.form.get('currency')?.setValue('');
    this.form.get('receipt')?.setValue(false);
    this.form.get('money')?.setValue(false);
    this.form.get('minor')?.setValue(false);
    this.form.get('confirm')?.setValue(false);

    // Limpiar estado de ubicación
    this.form.get('district')?.setValue('');
    this.form.get('province')?.setValue('');
    this.form.get('department')?.setValue('');
    this.selectedLocation.set(null);
    this.locationDropdownOpen.set(false);
    this.locationSearchTerm.set('');
    this.searchResults.set([]);
    this.loadingLocations.set(false);

    this.selectedFiles.set([]);
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  // --- MÉTODOS PRIVADOS - MENSAJES DE ERROR

  /**
   * Construye el mensaje de error para un campo
   */
  private buildErrorMessage(field: string, errorKey: string, errors: Record<string, any>): string {
    if (field === 'confirm') {
      if (errorKey === 'requiredTrue') return 'Debes confirmar que la información es correcta';
    }
    if (field === 'documentNumber' || field === 'tutorDocumentNumber' || field === 'legalRepDocumentNumber' || field === 'companyDocument') {
      if (field === 'companyDocument') {
        if (errorKey === 'minlength' || errorKey === 'maxlength') return 'El RUC debe tener exactamente 11 dígitos';
        if (errorKey === 'pattern') return 'El RUC solo debe contener números';
        if (errorKey === 'required') return 'El RUC es obligatorio';
      }
      const typeControlName = field === 'documentNumber' ? 'documentType' : field === 'tutorDocumentNumber' ? 'tutorDocumentType' : 'legalRepDocumentType';
      const rule = this.getDocRuleByTypeControl(typeControlName);
      return { required: 'Este campo es obligatorio', minlength: rule.hint, maxlength: rule.hint, pattern: rule.hint }[errorKey] || 'Por favor verifica este campo';
    }

    const fieldMessages: { [key: string]: { [error: string]: string } } = {
      phone: {
        required: 'El número de teléfono es obligatorio',
        invalidPhone: 'El teléfono debe tener exactamente 9 dígitos'
      },
      email: {
        email: 'Por favor ingresa un correo electrónico válido',
        pattern: 'Por favor ingresa un correo electrónico válido'
      },
      firstName: { pattern: 'El nombre solo puede contener letras y espacios', required: 'El nombre es obligatorio' },
      lastName: { pattern: 'Los apellidos solo pueden contener letras y espacios', required: 'Los apellidos son obligatorios' },
      tutorFirstName: { pattern: 'El nombre solo puede contener letras y espacios', required: 'El nombre del tutor es obligatorio' },
      tutorLastName: { pattern: 'Los apellidos solo pueden contener letras y espacios', required: 'Los apellidos del tutor son obligatorios' },
      legalRepFirstName: { pattern: 'El nombre solo puede contener letras y espacios', required: 'El nombre del representante es obligatorio' },
      legalRepLastName: { pattern: 'Los apellidos solo pueden contener letras y espacios', required: 'Los apellidos del representante son obligatorios' },
      companyName: { pattern: 'La razón social solo puede contener letras, números, espacios, puntos y caracteres válidos', required: 'La razón social es obligatoria' },
      district: { minlength: 'El distrito debe tener al menos 3 caracteres', required: 'El distrito es obligatorio' },
      address: {
        minlength: `Por favor proporciona una dirección más completa (mínimo ${this.MIN_ADDRESS_LENGTH} caracteres)`,
        maxlength: `La dirección no puede exceder ${this.MAX_ADDRESS_LENGTH} caracteres`,
        required: 'La dirección es obligatoria'
      },
      goodDescription: {
        minlength: `Por favor describe con más detalle (mínimo ${this.MIN_GOOD_DESC_LENGTH} caracteres)`,
        maxlength: `La descripción no puede exceder ${this.MAX_GOOD_DESC_LENGTH} caracteres`,
        required: 'La descripción es obligatoria'
      },
      claimDescription: {
        minlength: `Por favor explica el reclamo con más detalle (mínimo ${this.MIN_DESC_LENGTH} caracteres)`,
        maxlength: `La descripción del reclamo no puede exceder ${this.MAX_DESC_LENGTH} caracteres`,
        required: 'La descripción del reclamo es obligatoria'
      },
      request: {
        minlength: `Por favor indica claramente qué solicitas (mínimo ${this.MIN_REQUEST_LENGTH} caracteres)`,
        maxlength: `El pedido no puede exceder ${this.MAX_REQUEST_LENGTH} caracteres`,
        required: 'El pedido es obligatorio'
      },
      receiptType: { required: 'Selecciona el tipo de comprobante' },
      receiptNumber: {
        required: 'El número de comprobante es obligatorio',
        pattern: 'El número solo acepta letras, números y guiones',
        minlength: 'El número debe tener al menos 1 carácter',
        maxlength: 'El número debe tener máximo 20 caracteres'
      },
      claimAmount: {
        required: 'El monto es obligatorio',
        min: 'El monto debe ser mayor a 0',
        pattern: 'Ingrese un monto válido (máximo 2 decimales)'
      },
      documentType: { required: 'Selecciona el tipo de documento' },
      tutorDocumentType: { required: 'Selecciona el tipo de documento del tutor' },
      legalRepDocumentType: { required: 'Selecciona el tipo de documento del representante' }
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

  /**
   * Maneja los errores del backend
   */
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

  // --- MÉTODOS PRIVADOS - RECAPTCHA

  /**
   * Ejecuta reCAPTCHA con fallback
   */
  private async executeRecaptchaWithFallback(): Promise<string> {
    try {
      const token = await this.recaptchaService.execute(this.recaptchaAction);
      if (!token) {
        throw new Error('reCAPTCHA no devolvió un token válido');
      }
      return token;
    } catch (error) {
      this.toast.showError('No pudimos validar reCAPTCHA. Intenta de nuevo.');
      throw error;
    }
  }
}
