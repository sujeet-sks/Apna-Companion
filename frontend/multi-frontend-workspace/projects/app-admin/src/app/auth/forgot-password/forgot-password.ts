import { Component, inject, signal } from '@angular/core';
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
  message?: string;
}

interface ForgotPasswordRequestResponse {
  message: string;
  request_id: string;
  expires_in: number;
  resend_after: number;
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
  private requestId = '';

  protected readonly otpStage = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
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
    this.successMessage.set('');
    this.errorMessage.set('');

    if (!this.otpStage() && this.forgotPasswordForm.controls.email.invalid) {
      this.forgotPasswordForm.controls.email.markAsTouched();
      return;
    }

    if (this.otpStage() && this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    const { email, otp, newPassword, confirmPassword } =
      this.forgotPasswordForm.getRawValue();

    if (!this.otpStage()) {
      this.http
        .post<ForgotPasswordRequestResponse>(
          '/api/admin/forgot-password/request/',
          { email },
        )
        .subscribe({
          next: (response) => {
            this.isSubmitting.set(false);
            if (!response.request_id) {
              this.errorMessage.set(
                'Unable to continue because the request ID was not returned.',
              );
              return;
            }

            this.requestId = response.request_id;
            this.otpStage.set(true);
            this.successMessage.set(
              response.message ||
                'If an admin account exists, a code was sent.',
            );
            this.toast.show(this.successMessage());
          },
          error: (error: HttpErrorResponse) => {
            this.isSubmitting.set(false);
            this.errorMessage.set(
              error.error?.message ??
                'Unable to send the OTP. Please try again.',
            );
          },
        });
      return;
    }

    if (!this.requestId) {
      this.isSubmitting.set(false);
      this.errorMessage.set('Please request a new verification code.');
      return;
    }

    this.http
      .post<ApiResponse>('/api/admin/forgot-password/confirm/', {
        request_id: this.requestId,
        code: otp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          this.errorMessage.set('');
          this.successMessage.set(
            response.message ?? 'Password updated successfully.',
          );
          this.toast.show(this.successMessage());
          void this.router.navigate(['/login']);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            error.error?.message ?? 'Password cannot be updated.',
          );
        },
      });
  }

  private passwordsMatch(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordsMismatch: true };
  }
}
