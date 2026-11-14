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
  @Input() preview = false;
  @Input() active: CompanionNavigationItem = 'dashboard';

  get dashboardPath(): string {
    return this.preview ? '/dashboard-preview' : '/dashboard';
  }

  get profilePath(): string {
    return this.preview ? '/profile-preview' : '/profile';
  }
}
