import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type OrganizationNavigationItem =
  | 'dashboard'
  | 'bookings'
  | 'companions'
  | 'services'
  | 'profile';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  @Input() preview = false;
  @Input() active: OrganizationNavigationItem = 'dashboard';

  get dashboardPath(): string {
    return this.preview ? '/dashboard-preview' : '/dashboard';
  }

  get companionsPath(): string {
    return this.preview ? '/companions-preview' : '/companions';
  }

  get servicesPath(): string {
    return this.preview ? '/services-preview' : '/services';
  }

  get profilePath(): string {
    return this.preview ? '/profile-preview' : '/profile';
  }
}
