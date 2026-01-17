import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, LoginRequest } from '../../../services/auth.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  form!: FormGroup;
  isLoading = signal(false);

  constructor() {
    this.form = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  public isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  public getFieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.errors) return '';

    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['email']) return 'Correo electrónico inválido';
    if (control.errors['minlength']) return 'La contraseña debe tener al menos 6 caracteres';

    return 'Por favor verifica este campo';
  }

  public onSubmit(): void {
    if (this.form.invalid) return;

    this.isLoading.set(true);

    const credentials: LoginRequest = {
      email: this.form.get('email')?.value,
      password: this.form.get('password')?.value
    };

    this.authService.login(credentials).subscribe({
      next: () => {
        this.toast.showSuccess('Bienvenido');
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error) => {
        this.isLoading.set(false);
        const message = error?.error?.message || 'Correo o contraseña incorrectos';
        this.toast.showError(message);
      }
    });
  }
}
