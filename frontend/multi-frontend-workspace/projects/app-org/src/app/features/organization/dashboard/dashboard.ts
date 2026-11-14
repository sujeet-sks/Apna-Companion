import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  OrganizationBooking,
  OrganizationDashboardSummary,
  EligibleCompanion,
  OrganizationProfile,
  OrganizationService,
} from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  OrganizationNavigationItem,
  Sidebar,
} from '../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-organization-dashboard',
  standalone: true,
  imports: [DatePipe, Sidebar],
  templateUrl: './dashboard.html',
  styleUrls: [
    './dashboard.css',
    './dashboard-actions.css',
    '../../../shared/organization-page-layout.css',
  ],
})
export class OrganizationDashboard implements OnInit {
  private readonly organizations = inject(OrganizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  isPreview = this.route.snapshot.data['preview'] === true;
  activeNavigation: OrganizationNavigationItem = 'dashboard';
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
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.isPreview = data['preview'] === true;
      void this.refresh();
    });
    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fragment) => {
      this.activeNavigation = fragment === 'bookings' ? 'bookings' : 'dashboard';
    });
  }

  async refresh(): Promise<void> {
    this.loading = true;
    this.error = '';
    if (this.isPreview) {
      this.profile = {
        organization_id: 'demo-org',
        organization_name: 'Sunrise Community Care',
        organization_type: 'ngo',
        email: 'hello@sunrise.example',
        address: 'Mumbai, Maharashtra',
        logo_url: null,
        latitude: 19.1176,
        longitude: 72.906,
        document_type: 'NGO Registration Certificate',
        approval_status: 'approved',
        approval_remarks: null,
        is_active: true,
      };
      this.summary = { companions_total: 12, pending_bookings: 3, active_bookings: 5 };
      this.bookings = [
        { id: 1042, service_id: 2, service_name: 'Pharmacy visit', customer_name: 'Aarav Mehta', status: 'pending', scheduled_at: '2026-11-15T10:00:00Z', duration: 60, price_inr: '450.00', pickup_address: '24 Lake View Road, Powai, Mumbai', latitude: 19.1176, longitude: 72.9060, companion_id: null, companion_name: null },
        { id: 1041, service_id: 1, service_name: 'Grocery assistance', customer_name: 'Maya Shah', status: 'active', scheduled_at: '2026-11-14T14:30:00Z', duration: 90, price_inr: '600.00', pickup_address: '8 Green Park, Andheri East, Mumbai', latitude: 19.1136, longitude: 72.8697, companion_id: 'demo-1', companion_name: 'Riya Patel' },
        { id: 1039, service_id: 3, service_name: 'Clinic visit', customer_name: 'Kabir Rao', status: 'accepted', scheduled_at: '2026-11-14T11:00:00Z', duration: 60, price_inr: '500.00', pickup_address: '17 Hill Road, Bandra West, Mumbai', latitude: 19.0596, longitude: 72.8295, companion_id: null, companion_name: null },
      ];
      this.loading = false;
      return;
    }

    try {
      const [profile, summary, bookings] = await Promise.all([
        this.organizations.profile(),
        this.organizations.dashboard(),
        this.organizations.recentBookings(),
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
    }
  }

  async acceptBooking(booking: OrganizationBooking): Promise<void> {
    this.actionError = '';
    this.busyBookingId = booking.id;
    try {
      if (this.isPreview) {
        booking.status = 'accepted';
        if (this.summary) {
          this.summary = {
            ...this.summary,
            pending_bookings: Math.max(0, this.summary.pending_bookings - 1),
          };
        }
      } else {
        await this.organizations.acceptBooking(booking.id);
        await this.refresh();
      }
    } catch (error) {
      this.actionError = error instanceof Error ? error.message : 'Could not accept this booking.';
    } finally {
      this.busyBookingId = null;
    }
  }

  async loadEligibleCompanions(booking: OrganizationBooking): Promise<void> {
    this.actionError = '';
    this.busyBookingId = booking.id;
    try {
      if (this.isPreview) {
        this.eligibleByBooking[booking.id] = [
          { companion_id: 'demo-1', name: 'Riya Patel' },
          { companion_id: 'demo-2', name: 'Arjun Nair' },
        ];
      } else {
        const response = await this.organizations.eligibleCompanions(booking.id);
        this.eligibleByBooking[booking.id] = response.items;
      }
    } catch (error) {
      this.actionError = error instanceof Error ? error.message : 'Could not load eligible companions.';
    } finally {
      this.busyBookingId = null;
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
      const companion = this.eligibleByBooking[booking.id]?.find(
        (candidate) => candidate.companion_id === companionId,
      );
      if (this.isPreview) {
        booking.companion_id = companionId;
        booking.companion_name = companion?.name ?? 'Assigned companion';
        booking.status = 'assigned';
        if (this.summary) {
          this.summary = {
            ...this.summary,
            active_bookings: this.summary.active_bookings + 1,
          };
        }
      } else {
        await this.organizations.assignBooking(booking.id, companionId);
        await this.refresh();
      }
      delete this.eligibleByBooking[booking.id];
      delete this.selectedCompanion[booking.id];
    } catch (error) {
      this.actionError = error instanceof Error ? error.message : 'Could not assign this companion.';
    } finally {
      this.busyBookingId = null;
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
