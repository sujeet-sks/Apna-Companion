import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar',
  styleUrl: './sidebar.css',
  templateUrl: './sidebar.html',
})
export class Sidebar {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  protected isLoggingOut = false;

  protected logout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;
    this.http.post('/adminPortal/auth/logout', {}).subscribe({
      next: () => this.completeLogout(),
      error: () => this.completeLogout(),
    });
  }

  private completeLogout(): void {
    this.isLoggingOut = false;
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('admin_user');
    void this.router.navigate(['/login']);
  }
}
