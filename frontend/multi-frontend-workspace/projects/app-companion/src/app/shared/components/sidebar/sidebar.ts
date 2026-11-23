import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type CompanionNavigationItem = 'dashboard' | 'journeys' | 'profile';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  @Input() active: CompanionNavigationItem = 'dashboard';

  get dashboardPath(): string {
    return '/dashboard';
  }

  get pastJourneysPath(): string {
    return '/past-journeys';
  }

  get profilePath(): string {
    return '/profile';
  }
}
