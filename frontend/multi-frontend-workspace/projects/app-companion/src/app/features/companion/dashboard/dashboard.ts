import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CompanionBooking,
  CompanionDashboardSummary,
  CompanionService,
} from '../../../core/services/companion.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-companion-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css', './dashboard-actions.css'],
})
export class CompanionDashboard implements OnInit {
  private readonly companions = inject(CompanionService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  isPreview = this.route.snapshot.data['preview'] === true;
  readonly auth = inject(AuthService);

  summary: CompanionDashboardSummary | null = null;
  bookings: CompanionBooking[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.isPreview = data['preview'] === true;
      void this.refresh();
    });
  }

  async refresh(): Promise<void> {
    this.loading = true;
    this.error = '';
    if (this.isPreview) {
      this.summary = { active_count: 2, past_count: 18 };
      this.bookings = [
        {
          id: 204,
          service_name: 'Pharmacy visit',
          customer_name: 'Aarav Mehta',
          organization_name: 'Sunrise Community Care',
          status: 'assigned',
          scheduled_at: '2026-11-15T09:30:00Z',
          duration: 60,
          price_inr: '450.00',
          service_notes: 'Please bring the prescription and collect the medication.',
          pickup_address: '24 Lake View Road, Powai, Mumbai',
          latitude: 19.1176,
          longitude: 72.906,
        },
        {
          id: 198,
          service_name: 'Grocery shopping',
          customer_name: 'Maya Shah',
          organization_name: 'Sunrise Community Care',
          status: 'in_progress',
          scheduled_at: '2026-11-14T13:00:00Z',
          duration: 90,
          price_inr: '600.00',
          service_notes: 'Call the customer on arrival.',
          pickup_address: '8 Green Park, Andheri East, Mumbai',
          latitude: 19.1136,
          longitude: 72.8697,
        },
      ];
      this.loading = false;
      return;
    }

    try {
      const [summary, bookings] = await Promise.all([
        this.companions.dashboard(),
        this.companions.activeBookings(),
      ]);
      this.summary = summary;
      this.bookings = bookings;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not load your dashboard.';
    } finally {
      this.loading = false;
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
