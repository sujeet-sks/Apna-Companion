import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../shared/toast.service';

interface ApiResponse {
  status_code?: number;
  message?: string;
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-forgot-password',
  styleUrl: '../login/login.css',
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected otpStage = false;
  protected isSubmitting = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected readonly forgotPasswordForm = new FormGroup(
    {
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      otp: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(6),
          Validators.pattern(/^\d{6}$/),
        ],
      }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: this.passwordsMatch },
  );

  protected onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.otpStage && this.forgotPasswordForm.controls.email.invalid) {
      this.forgotPasswordForm.controls.email.markAsTouched();
      return;
    }

    if (this.otpStage && this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    const { email, otp, newPassword, confirmPassword } =
      this.forgotPasswordForm.getRawValue();
  
    if (!this.otpStage) {
      this.http
        .post<ApiResponse>('/adminPortal/auth/sendOTP', { email })
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.status_code !== undefined && response.status_code !== 200) {
              this.errorMessage =
                response.message ?? 'Unable to send the OTP. Please try again.';
              return;
            }
            this.otpStage = true;
            this.successMessage =
              response.message ?? 'OTP sent successfully.';
            this.toast.show(this.successMessage);
          },
          error: (error: HttpErrorResponse) => {
            this.isSubmitting = false;
            this.errorMessage =
              error.error?.message ?? 'Unable to send the OTP. Please try again.';
          },
        });
      return;
    }

    this.http
      .post<ApiResponse>('/adminPortal/auth/verifyOTP', {
        email,
        otp,
        newPassword,
        confirmPassword,
      })
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.status_code !== undefined && response.status_code !== 200) {
            this.errorMessage =
              response.message ?? 'OTP verification failed. Please try again.';
            return;
          }
          this.errorMessage = '';
          this.successMessage =
            response.message ?? 'Password changed successfully!';
          this.toast.show(this.successMessage);
          void this.router.navigate(['/login']);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.errorMessage =
            error.error?.message ?? 'OTP verification failed. Please try again.';
        },
      });
  }

  private passwordsMatch(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordsMismatch: true };
  }
}
