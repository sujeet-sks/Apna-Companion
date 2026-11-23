import { DatePipe } from '@angular/common';
import { DurationPipe } from '../../../../../../shared/duration.pipe';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  OrganizationBooking,
  OrganizationDashboardSummary,
  EligibleCompanion,
  OrganizationProfile,
  OrganizationService,
} from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-organization-dashboard',
  standalone: true,
  imports: [DatePipe, DurationPipe, Sidebar],
  templateUrl: './dashboard.html',
  styleUrls: [
    './dashboard.css',
    './dashboard-actions.css',
    '../../../shared/organization-page-layout.css',
  ],
})
export class OrganizationDashboard implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly organizations = inject(OrganizationService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  profile: OrganizationProfile | null = null;
  summary: OrganizationDashboardSummary | null = null;
  bookings: OrganizationBooking[] = [];
  eligibleByBooking: Record<number, EligibleCompanion[]> = {};
  selectedCompanion: Record<number, string> = {};
  loading = true;
  error = '';
  actionError = '';
  busyBookingId: number | null = null;

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const [profile, summary, bookings] = await Promise.all([
        this.organizations.profile(),
        this.organizations.dashboard(),
        this.organizations.allBookings(),
      ]);
      this.profile = profile;
      this.summary = summary;
      this.bookings = bookings;
      this.eligibleByBooking = {};
      this.selectedCompanion = {};
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not load your dashboard.';
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  async acceptBooking(booking: OrganizationBooking): Promise<void> {
    this.actionError = '';
    this.busyBookingId = booking.id;
    try {
      await this.organizations.acceptBooking(booking.id);
      await this.refresh();
    } catch (error) {
      this.actionError = error instanceof Error ? error.message : 'Could not accept this booking.';
    } finally {
      this.busyBookingId = null;
      this.changeDetector.markForCheck();
    }
  }

  async loadEligibleCompanions(booking: OrganizationBooking): Promise<void> {
    this.actionError = '';
    this.busyBookingId = booking.id;
    try {
      const response = await this.organizations.eligibleCompanions(booking.id);
      this.eligibleByBooking[booking.id] = response.items;
    } catch (error) {
      this.actionError = error instanceof Error ? error.message : 'Could not load eligible companions.';
    } finally {
      this.busyBookingId = null;
      this.changeDetector.markForCheck();
    }
  }

  onCompanionSelected(bookingId: number, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.selectedCompanion[bookingId] = target.value;
    }
  }

  async assignBooking(booking: OrganizationBooking): Promise<void> {
    const companionId = this.selectedCompanion[booking.id];
    if (!companionId) {
      this.actionError = 'Choose an eligible companion before assigning.';
      return;
    }
    this.actionError = '';
    this.busyBookingId = booking.id;
    try {
      await this.organizations.assignBooking(booking.id, companionId);
      await this.refresh();
      delete this.eligibleByBooking[booking.id];
      delete this.selectedCompanion[booking.id];
    } catch (error) {
      this.actionError = error instanceof Error ? error.message : 'Could not assign this companion.';
    } finally {
      this.busyBookingId = null;
      this.changeDetector.markForCheck();
    }
  }

  async logout(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      await this.router.navigateByUrl('/login');
    }
  }
}
