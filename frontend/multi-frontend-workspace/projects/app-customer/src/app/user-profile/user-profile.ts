import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

interface CustomerProfile {
  full_name: string;
  email_id: string;
  mobile_number: string;
  dob: string;
  gender: string;
}

interface CustomerProfileResponse {
  customer?: Partial<CustomerProfile> | null;
}

@Component({
  selector: 'app-user-profile',
  styleUrl: './user-profile.css',
  templateUrl: './user-profile.html',
})
export class UserProfile implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly profileApiUrl = '/api/customer/me/';
  private readonly logoutApiUrl = '/api/customer/logout/';

  readonly fullName = signal('');
  readonly email = signal('');
  readonly mobileNumber = signal('');
  readonly dateOfBirth = signal('');
  readonly gender = signal('');
  readonly isLoadingProfile = signal(false);
  readonly profileError = signal('');
  readonly isLoggingOut = signal(false);
  readonly logoutError = signal('');
  readonly initials = computed(() => {
    const name = this.fullName().trim();
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase() || 'C'
    );
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    if (this.isLoadingProfile()) {
      return;
    }

    this.profileError.set('');
    this.isLoadingProfile.set(true);
    this.http
      .get<CustomerProfileResponse>(this.profileApiUrl, {
        params: { identifier: '' },
      })
      .pipe(finalize(() => this.isLoadingProfile.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.customer) {
            this.profileError.set(
              'The profile response was incomplete. Please try again.',
            );
            return;
          }

          this.fullName.set(response.customer.full_name?.trim() || 'Not provided');
          this.email.set(response.customer.email_id?.trim() || 'Not provided');
          this.mobileNumber.set(
            response.customer.mobile_number?.trim() || 'Not provided',
          );
          this.dateOfBirth.set(response.customer.dob?.trim() || 'Not provided');
          this.gender.set(response.customer.gender?.trim() || 'Not provided');
        },
        error: (error: HttpErrorResponse) => {
          this.profileError.set(
            error.error?.message ??
              'Unable to load your profile. Please try again.',
          );
        },
      });
  }

  logout(): void {
    if (this.isLoggingOut()) {
      return;
    }

    this.logoutError.set('');
    this.isLoggingOut.set(true);
    this.http
      .post<{ message: string }>(this.logoutApiUrl, { identifier: '' })
      .pipe(finalize(() => this.isLoggingOut.set(false)))
      .subscribe({
        next: () => {
          window.sessionStorage.clear();
          void this.router.navigate(['/login']);
        },
        error: (error: HttpErrorResponse) => {
          this.logoutError.set(
            error.error?.message ?? 'Unable to log out. Please try again.',
          );
        },
      });
  }
}
