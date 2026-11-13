import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastService } from '../../shared/toast.service';

interface RegistrationStartResponse {
  verification_id: string;
  expires_in: number;
}

interface RegistrationCompleteResponse {
  message: string;
  customer: {
    customer_id: number;
    full_name: string;
    email_id: string;
    mobile_number: string;
    dob: string;
    gender: string;
    account_status: string;
    created_at: string;
    updated_at: string;
  };
}

const matchingPasswordsValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirm_password')?.value;
  return password && confirmPassword && password !== confirmPassword
    ? { passwordMismatch: true }
    : null;
};

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-register',
  styleUrls: ['../login-common.css', './register.css'],
  templateUrl: './register.html',
})
export class Register {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly registrationStartUrl = '/api/customer/register/start/';
  private readonly registrationCompleteUrl = '/api/customer/register/complete/';
  protected readonly latestDateOfBirth = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60_000,
  ).toISOString().slice(0, 10);

  readonly registrationForm = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.pattern(/\S/)]],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      password: ['', Validators.required],
      confirm_password: ['', Validators.required],
    },
    { validators: matchingPasswordsValidator },
  );

  protected readonly otpForm = this.fb.group({
    email_code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    mobile_code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  protected readonly otpSent = signal(false);
  private verificationId = '';
  protected showPassword = false;
  protected showConfirmPassword = false;
  protected readonly isSendingOtp = signal(false);
  protected readonly isCompletingRegistration = signal(false);
  protected readonly errorMessage = signal('');

  protected get canCompleteRegistration(): boolean {
    return (
      this.otpSent() &&
      this.otpForm.valid &&
      !this.isSendingOtp() &&
      !this.isCompletingRegistration()
    );
  }

  protected sendOtp(): void {
    if (
      this.registrationForm.invalid ||
      this.isSendingOtp() ||
      this.isCompletingRegistration() ||
      this.otpSent()
    ) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    const {
      fullName,
      dob,
      gender,
      email,
      mobile,
      password,
      confirm_password,
    } = this.registrationForm.getRawValue();
    this.errorMessage.set('');
    this.isSendingOtp.set(true);
    this.registrationForm.disable({ emitEvent: false });
    this.otpForm.reset();
    this.http
      .post<RegistrationStartResponse>(this.registrationStartUrl, {
        full_name: fullName.trim(),
        email_id: email.trim(),
        mobile_number: mobile.trim(),
        dob,
        gender,
        password,
        confirm_password,
      })
      .pipe(
        finalize(() => {
          this.isSendingOtp.set(false);
          if (!this.otpSent()) {
            this.registrationForm.enable({ emitEvent: false });
          }
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.verification_id) {
            this.errorMessage.set(
              'The registration response was incomplete. Please try again.',
            );
            return;
          }

          this.verificationId = response.verification_id;
          this.otpSent.set(true);
          this.toast.show('otp has been send to mobile and email');
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to start registration. Please check your details and try again.',
          );
        },
      });
  }

  protected completeRegistration(): void {
    if (!this.canCompleteRegistration || !this.verificationId) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.isCompletingRegistration.set(true);
    this.http
      .post<RegistrationCompleteResponse>(this.registrationCompleteUrl, {
        verification_id: this.verificationId,
        ...this.otpForm.getRawValue(),
      })
      .pipe(finalize(() => this.isCompletingRegistration.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.customer?.customer_id) {
            const message = 'The registration response was incomplete. Please try again.';
            this.errorMessage.set(message);
            this.toast.show(message, 'error');
            return;
          }
          this.toast.show(
            response.message || 'Customer registered successfully.',
            'success',
          );
          void this.router.navigate(['/login']);
        },
        error: (error: HttpErrorResponse) => {
          const message =
            error.error?.message ??
            'Unable to verify the codes and complete registration. Please try again.';
          this.errorMessage.set(message);
          this.toast.show(message, 'error');
        },
      });
  }

}
