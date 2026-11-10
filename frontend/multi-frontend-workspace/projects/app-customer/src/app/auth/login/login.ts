import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

interface CustomerLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
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

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  styleUrls: ['../login-common.css', './login.css'],
  templateUrl: './login.html',
})
export class Login {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly loginApiUrl = '/api/customer/login/';

  protected submitted = false;
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly loginForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, emailOrMobileValidator],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.loginForm.getRawValue();
    this.errorMessage.set('');
    this.isSubmitting.set(true);
    this.http
      .post<CustomerLoginResponse>(this.loginApiUrl, {
        identifier: username.trim(),
        password,
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.access_token || !response.customer?.customer_id) {
            this.errorMessage.set('The login response was incomplete. Please try again.');
            return;
          }

          sessionStorage.setItem('access_token', response.access_token);
          sessionStorage.setItem('customer_id', String(response.customer.customer_id));
          sessionStorage.setItem('full_name', response.customer.full_name ?? '');
          sessionStorage.setItem('email_id', response.customer.email_id ?? '');
          sessionStorage.setItem('mobile_number', response.customer.mobile_number ?? '');
          localStorage.setItem('userID', String(response.customer.customer_id));
          this.submitted = true;
          void this.router.navigate(['/home']);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ??
              'Unable to log in. Check your details and try again.',
          );
        },
      });
  }
}
