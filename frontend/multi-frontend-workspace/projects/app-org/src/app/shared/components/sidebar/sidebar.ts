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
  @Input() active: OrganizationNavigationItem = 'dashboard';

  get dashboardPath(): string {
    return '/dashboard';
  }

  get bookingsPath(): string {
    return '/bookings';
  }

  get companionsPath(): string {
    return '/companions';
  }

  get servicesPath(): string {
    return '/services';
  }

  get profilePath(): string {
    return '/profile';
  }
}
