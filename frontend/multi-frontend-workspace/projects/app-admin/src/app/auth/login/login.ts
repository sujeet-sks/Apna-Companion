import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../shared/toast.service';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  status_code: number;
  data?: {
    access_token: string;
    adminId?: string;
    EmailId?: string;
    full_name?: string;
  };
  message?: string;
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected showPassword = false;
  protected isSubmitting = false;
  protected errorMessage = '';
  protected readonly loginForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  protected onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const { username, password } = this.loginForm.getRawValue();
    const request: LoginRequest = {
      email: username,
      password,
    };

    this.http.post<LoginResponse>('/adminPortal/auth/login', request).subscribe({
      next: (response: LoginResponse) => {
        this.isSubmitting = false;

        if (response.status_code !== 200 || !response.data?.access_token) {
          this.errorMessage =
            response.message ?? 'Login failed. Please try again.';
          return;
        }

        sessionStorage.setItem('access_token', response.data.access_token);
        sessionStorage.setItem(
          'admin_user',
          JSON.stringify({
            adminId: response.data.adminId ?? '',
            EmailId: response.data.EmailId ?? username,
            full_name: response.data.full_name ?? '',
          }),
        );

        this.toast.show(response.message ?? 'Login successful.');
        void this.router.navigate(['/admin/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.errorMessage =
          error.error?.message ??
          'Unable to sign in. Please check your email and password.';
      },
    });
  }
}
