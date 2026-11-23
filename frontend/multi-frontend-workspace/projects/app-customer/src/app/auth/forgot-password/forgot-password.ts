import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastService } from '../../shared/toast.service';

interface ForgotPasswordRequestResponse {
  message: string;
  request_id: string;
  expires_in: number;
}

const emailOrMobileValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) {
    return null;
  }

  if (Validators.email(new FormControl(value)) === null) {
    return null;
  }

  const normalizedMobile = value.replace(/[\s()-]/g, '');
  return /^\+?[1-9]\d{9}$/.test(normalizedMobile)
    ? null
    : { emailOrMobile: true };
};

const matchingPasswordsValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const newPassword = control.get('new_password')?.value;
  const confirmPassword = control.get('confirm_password')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword
    ? { passwordMismatch: true }
    : null;
};

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-forgot-password',
  styleUrls: ['../login-common.css', './forgot-password.css'],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly requestApiUrl = '/api/customer/forgot-password/request/';
  private readonly confirmApiUrl = '/api/customer/forgot-password/confirm/';

  protected readonly identifierForm = this.fb.group({
    identifier: ['', [Validators.required, emailOrMobileValidator]],
  });
  protected readonly resetForm = this.fb.group(
    {
      code: ['', Validators.required],
      new_password: ['', Validators.required],
      confirm_password: ['', Validators.required],
    },
    { validators: matchingPasswordsValidator },
  );

  protected readonly requestId = signal('');
  protected readonly statusMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly isRequesting = signal(false);
  protected readonly isResetting = signal(false);

  protected get canRequestCode(): boolean {
    return !this.isRequesting();
  }

  protected get canResetPassword(): boolean {
    return !this.isResetting();
  }

  protected requestCode(): void {
    if (this.identifierForm.invalid) {
      this.identifierForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');
    this.isRequesting.set(true);
    this.http
      .post<ForgotPasswordRequestResponse>(this.requestApiUrl, {
        identifier: this.identifierForm.controls.identifier.value.trim(),
      })
      .pipe(finalize(() => this.isRequesting.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.request_id) {
            const message =
              'The password reset response was incomplete. Please try again.';
            this.errorMessage.set(message);
            this.toast.show(message, 'error');
            return;
          }

          this.requestId.set(response.request_id);
          const message =
            response.message || 'A verification code has been sent.';
          this.statusMessage.set(message);
          this.toast.show(message, 'success');
        },
        error: (error: HttpErrorResponse) => {
          const message =
            error.error?.message ??
            'Unable to request a password reset. Check your details and try again.';
          this.errorMessage.set(message);
          this.toast.show(message, 'error');
        },
      });
  }

  protected resetPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.isResetting.set(true);
    this.http
      .post<{ message?: string }>(this.confirmApiUrl, {
        request_id: this.requestId(),
        ...this.resetForm.getRawValue(),
      })
      .pipe(finalize(() => this.isResetting.set(false)))
      .subscribe({
        next: (response) => {
          this.toast.show(
            response.message || 'Password reset successfully.',
            'success',
          );
          void this.router.navigate(['/login']);
        },
        error: (error: HttpErrorResponse) => {
          const message =
            error.error?.message ??
            'Unable to reset your password. Check the code and try again.';
          this.errorMessage.set(message);
          this.toast.show(message, 'error');
        },
      });
  }
}
