import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-organization-overview',
  imports: [Sidebar],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class OrganizationOverview {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dashboardCounts = inject(OrganizationService).dashboardCounts;

  get counts() {
    return this.dashboardCounts();
  }

  async logout(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      await this.router.navigateByUrl('/login');
    }
  }
}
