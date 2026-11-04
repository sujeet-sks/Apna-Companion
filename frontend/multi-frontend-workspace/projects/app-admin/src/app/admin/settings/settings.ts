import { Component, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ToastService } from '../../shared/toast.service';

interface ApiResponse {
  status_code?: number;
  message?: string;
}

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-settings',
  styleUrl: './settings.css',
  templateUrl: './settings.html',
})
export class Settings {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected isProfileSubmitting = false;
  protected isPasswordSubmitting = false;
  protected profileMessage = '';
  protected passwordMessage = '';

  protected profileForm = new FormGroup({
    adminId: new FormControl(this.readStoredUser()?.adminId ?? ''),
    full_name: new FormControl(this.readStoredUser()?.full_name ?? '', Validators.required),
    EmailId: new FormControl(this.readStoredUser()?.EmailId ?? '', [
      Validators.required,
      Validators.email,
    ]),
  });

  protected passwordForm = new FormGroup(
    {
      currentPassword: new FormControl('', Validators.required),
      newPassword: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
      ]),
      confirmPassword: new FormControl('', Validators.required),
    },
    { validators: this.passwordsMatch },
  );

  protected updateProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isProfileSubmitting = true;
    this.profileMessage = '';
    this.http
      .post<ApiResponse>(
        '/adminPortal/admin/updateProfile',
        this.profileForm.getRawValue(),
      )
      .subscribe({
        next: (response) => {
          this.isProfileSubmitting = false;
          this.profileMessage =
            response.message ?? 'Profile updated successfully.';
          this.toast.show(this.profileMessage);
        },
        error: (error: HttpErrorResponse) => {
          this.isProfileSubmitting = false;
          this.profileMessage =
            error.error?.message ?? 'Unable to update profile.';
        },
      });
  }

  protected changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { confirmPassword, ...passwordData } =
      this.passwordForm.getRawValue();
    void confirmPassword;

    this.isPasswordSubmitting = true;
    this.passwordMessage = '';
    this.http
      .post<ApiResponse>(
        '/adminPortal/admin/changePassword',
        passwordData,
      )
      .subscribe({
        next: (response) => {
          this.isPasswordSubmitting = false;
          this.passwordMessage =
            response.message ?? 'Password changed successfully.';
          this.passwordForm.reset();
          this.toast.show(this.passwordMessage);
        },
        error: (error: HttpErrorResponse) => {
          this.isPasswordSubmitting = false;
          this.passwordMessage =
            error.error?.message ?? 'Unable to change password.';
        },
      });
  }

  private passwordsMatch(
    control: AbstractControl,
  ): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordsMismatch: true };
  }

  private readStoredUser(): {
    adminId?: string;
    EmailId?: string;
    full_name?: string;
  } | null {
    const storedUser = sessionStorage.getItem('admin_user');
    return storedUser ? JSON.parse(storedUser) : null;
  }
}
