import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../shared/toast.service';

interface LogoutResponse {
  message: string;
}

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar',
  styleUrl: './sidebar.css',
  templateUrl: './sidebar.html',
})
export class Sidebar {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected isLoggingOut = false;

  protected logout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;
    const storedAdmin = sessionStorage.getItem('admin_user');
    let email: string | undefined;

    try {
      const adminUser: unknown = storedAdmin ? JSON.parse(storedAdmin) : null;
      if (typeof adminUser === 'object' && adminUser !== null) {
        if ('email' in adminUser && typeof adminUser.email === 'string') {
          email = adminUser.email;
        } else if (
          'EmailId' in adminUser &&
          typeof adminUser.EmailId === 'string'
        ) {
          email = adminUser.EmailId;
        }
      }
    } catch {
      this.toast.show(
        'Unable to read the admin email. Signing out locally.',
        'error',
      );
      this.completeLogout();
      return;
    }

    if (!email) {
      this.toast.show('Admin email is missing. Signing out locally.', 'error');
      this.completeLogout();
      return;
    }

    this.http.post<LogoutResponse>('/api/admin/logout/', { email }).subscribe({
      next: (response: LogoutResponse) => {
        this.toast.show(response.message || 'Logged out.');
        this.completeLogout();
      },
      error: (error: HttpErrorResponse) => {
        this.toast.show(
          error.error?.message ?? 'Logout failed. Signing out locally.',
          'error',
        );
        this.completeLogout();
      },
    });
  }

  private completeLogout(): void {
    this.isLoggingOut = false;
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('token_type');
    sessionStorage.removeItem('expires_in');
    sessionStorage.removeItem('admin_user');
    void this.router.navigate(['/login']);
  }
}
