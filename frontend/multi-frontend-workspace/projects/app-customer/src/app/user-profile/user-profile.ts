import { Component } from '@angular/core';

@Component({
  selector: 'app-user-profile',
  styleUrl: './user-profile.css',
  templateUrl: './user-profile.html',
})
export class UserProfile {
  readonly customerId = this.getSessionValue('customer_id') || 'Not provided';
  readonly fullName = this.getSessionValue('full_name') || 'Not provided';
  readonly email = this.getSessionValue('email_id') || 'Not provided';
  readonly mobileNumber = this.getSessionValue('mobile_number') || 'Not provided';
  readonly initials =
    this.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || 'C';

  private getSessionValue(key: string): string {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(key)?.trim() ?? '';
  }
}
