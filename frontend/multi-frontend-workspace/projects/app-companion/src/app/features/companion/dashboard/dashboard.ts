import { DatePipe } from '@angular/common';
import { DurationPipe } from '../../../../../../shared/duration.pipe';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CompanionBooking,
  CompanionBookingDetails,
  CompanionDashboardSummary,
  CompanionService,
} from '../../../core/services/companion.service';
import { estimateCompanionCollection } from '../../../core/services/companion-billing';
import { AuthService } from '../../../core/services/auth.service';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';

interface ManualCollectionSummary {
  bookingId: number;
  serviceName: string;
  bookingDurationMinutes: number;
  elapsedMinutes?: number;
  billableHours?: number;
  hourlyRate?: string;
  amount?: string;
  calculationError?: string;
}

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

@Component({
  selector: 'app-companion-dashboard',
  standalone: true,
  imports: [DatePipe, DurationPipe, FormsModule, Sidebar],
  templateUrl: './dashboard.html',
  styleUrls: [
    './dashboard.css',
    './dashboard-actions.css',
    '../../../shared/companion-page-layout.css',
  ],
})
export class CompanionDashboard implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly companions = inject(CompanionService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  summary: CompanionDashboardSummary | null = null;
  bookings: CompanionBooking[] = [];
  activeBookingTotal = 0;
  bookingPage = 1;
  readonly bookingPageSize = 10;
  loading = true;
  error = '';
  estimatedEarningsPaise = 0;
  earningsLoading = false;
  earningsError = '';
  busyBookingId: number | null = null;
  actionErrors: Record<number, string> = {};
  startCodes: Record<number, string> = {};
  endCodes: Record<number, string> = {};
  expandedBookingId: number | null = null;
  bookingDetails: CompanionBookingDetails | null = null;
  detailsLoading = false;
  detailsError = '';
  collectionSummaries: ManualCollectionSummary[] = [];
  private detailsRequestId = 0;
  private earningsRefreshQueued = false;

  ngOnInit(): void {
    void this.refresh();
    void this.loadEstimatedEarnings();
  }

  refreshAll(): void {
    void this.refresh();
    void this.loadEstimatedEarnings();
  }

  async refresh(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const [summary, page] = await Promise.all([
        this.companions.dashboard(),
        this.companions.activeBookings(this.bookingPage, this.bookingPageSize),
      ]);
      this.summary = summary;
      if (
        !page.items.length &&
        this.bookingPage > 1 &&
        (this.bookingPage - 1) * this.bookingPageSize >= page.total
      ) {
        this.bookingPage = Math.max(1, Math.ceil(page.total / this.bookingPageSize));
        const lastPage = await this.companions.activeBookings(
          this.bookingPage,
          this.bookingPageSize,
        );
        this.bookings = lastPage.items;
        this.activeBookingTotal = lastPage.total;
      } else {
        this.bookings = page.items;
        this.activeBookingTotal = page.total;
      }
      if (
        this.expandedBookingId !== null &&
        !this.bookings.some((booking) => booking.id === this.expandedBookingId)
      ) {
        this.closeBookingDetails();
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not load your dashboard.';
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  async loadEstimatedEarnings(): Promise<void> {
    if (this.earningsLoading) {
      this.earningsRefreshQueued = true;
      return;
    }

    this.earningsLoading = true;
    this.earningsError = '';
    try {
      const firstPage = await this.companions.pastJourneys(1, 50);
      const completedJourneys = firstPage.items.filter(
        (journey) => journey.status === 'completed',
      );
      const pageCount = Math.ceil(firstPage.total / firstPage.page_size);
      for (let page = 2; page <= pageCount; page += 1) {
        const history = await this.companions.pastJourneys(page, firstPage.page_size);
        completedJourneys.push(
          ...history.items.filter((journey) => journey.status === 'completed'),
        );
      }

      let totalPaise = 0;
      const detailsPerBatch = 5;
      for (let index = 0; index < completedJourneys.length; index += detailsPerBatch) {
        const batch = completedJourneys.slice(index, index + detailsPerBatch);
        const details = await Promise.all(
          batch.map((journey) => this.companions.bookingDetails(journey.id)),
        );
        for (const booking of details) {
          if (!booking.started_at || !booking.completed_at) {
            throw new Error(`Journey ${booking.id} is missing its start or completion time.`);
          }
          totalPaise += estimateCompanionCollection(
            booking.price_inr,
            booking.duration,
            booking.started_at,
            booking.completed_at,
          ).amountInPaise;
        }
      }
      this.estimatedEarningsPaise = totalPaise;
    } catch (error) {
      this.earningsError =
        error instanceof Error ? error.message : 'Could not calculate completed journey value.';
    } finally {
      this.earningsLoading = false;
      this.changeDetector.markForCheck();
      if (this.earningsRefreshQueued) {
        this.earningsRefreshQueued = false;
        void this.loadEstimatedEarnings();
      }
    }
  }

  get bookingPageCount(): number {
    return Math.max(1, Math.ceil(this.activeBookingTotal / this.bookingPageSize));
  }

  changeBookingPage(page: number): void {
    if (
      this.loading ||
      this.busyBookingId !== null ||
      page < 1 ||
      page > this.bookingPageCount
    ) {
      return;
    }
    this.bookingPage = page;
    this.closeBookingDetails();
    void this.refresh();
  }

  updateBookingStatus(
    booking: CompanionBooking,
    status: 'on_the_way' | 'arrived',
  ): void {
    void this.performBookingAction(booking, () =>
      this.companions.updateBookingStatus(booking.id, status),
    );
  }

  startBooking(booking: CompanionBooking): void {
    const code = this.startCodes[booking.id]?.trim() ?? '';
    if (!/^[0-9]{6}$/.test(code)) {
      this.actionErrors[booking.id] = 'Enter the customer’s six-digit start code.';
      return;
    }
    void this.performBookingAction(
      booking,
      () => this.companions.startBooking(booking.id, code),
      () => delete this.startCodes[booking.id],
    );
  }

  completeBooking(booking: CompanionBooking): void {
    const code = this.endCodes[booking.id]?.trim() ?? '';
    if (!/^[0-9]{6}$/.test(code)) {
      this.actionErrors[booking.id] = 'Enter the customer’s six-digit end code.';
      return;
    }
    void this.performBookingAction(
      booking,
      async () => {
        const details = await this.companions.bookingDetails(booking.id);
        if (!details.started_at) {
          throw new Error('The service start time is unavailable; the journey was not completed.');
        }
        const completion = await this.companions.completeBooking(booking.id, code);
        try {
          const estimate = estimateCompanionCollection(
            details.price_inr,
            details.duration,
            details.started_at,
            completion.completed_at,
          );
          return { details, estimate, calculationError: undefined };
        } catch (error) {
          return {
            details,
            estimate: undefined,
            calculationError:
              error instanceof Error ? error.message : 'The amount could not be calculated.',
          };
        }
      },
      ({ details, estimate, calculationError }) => {
        const summary: ManualCollectionSummary = {
          bookingId: booking.id,
          serviceName: details.service_name,
          bookingDurationMinutes: details.duration,
        };
        if (estimate) {
          summary.elapsedMinutes = estimate.elapsedMinutes;
          summary.billableHours = estimate.billableHours;
          summary.hourlyRate = this.formatInr(estimate.hourlyRateInPaise);
          summary.amount = this.formatInr(estimate.amountInPaise);
        } else {
          summary.calculationError = calculationError;
        }
        this.collectionSummaries = [summary, ...this.collectionSummaries];
        delete this.endCodes[booking.id];
        void this.loadEstimatedEarnings();
      },
    );
  }

  dismissCollectionSummary(bookingId: number): void {
    this.collectionSummaries = this.collectionSummaries.filter(
      (summary) => summary.bookingId !== bookingId,
    );
  }

  toggleBookingDetails(booking: CompanionBooking): void {
    if (this.expandedBookingId === booking.id) {
      this.closeBookingDetails();
      return;
    }
    void this.loadBookingDetails(booking.id);
  }

  async loadBookingDetails(bookingId: number): Promise<void> {
    const requestId = ++this.detailsRequestId;
    this.expandedBookingId = bookingId;
    this.bookingDetails = null;
    this.detailsError = '';
    this.detailsLoading = true;
    try {
      const details = await this.companions.bookingDetails(bookingId);
      if (requestId === this.detailsRequestId) {
        this.bookingDetails = details;
      }
    } catch (error) {
      if (requestId === this.detailsRequestId) {
        this.detailsError =
          error instanceof Error ? error.message : 'Could not load booking details.';
      }
    } finally {
      if (requestId === this.detailsRequestId) {
        this.detailsLoading = false;
        this.changeDetector.markForCheck();
      }
    }
  }

  private async performBookingAction<T>(
    booking: CompanionBooking,
    action: () => Promise<T>,
    onSuccess?: (result: T) => void,
  ): Promise<void> {
    if (this.busyBookingId !== null || this.loading) return;
    this.busyBookingId = booking.id;
    delete this.actionErrors[booking.id];
    this.closeBookingDetails();
    try {
      const result = await action();
      onSuccess?.(result);
      await this.refresh();
    } catch (error) {
      this.actionErrors[booking.id] =
        error instanceof Error ? error.message : 'Could not update this journey.';
    } finally {
      this.busyBookingId = null;
      this.changeDetector.markForCheck();
    }
  }

  private closeBookingDetails(): void {
    this.expandedBookingId = null;
    this.bookingDetails = null;
    this.detailsError = '';
    this.detailsLoading = false;
    this.detailsRequestId += 1;
  }

  private formatInr(amountInPaise: number): string {
    return INR_FORMATTER.format(amountInPaise / 100);
  }

  formatEstimatedEarnings(): string {
    return this.formatInr(this.estimatedEarningsPaise);
  }

  async logout(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      await this.router.navigateByUrl('/login');
    }
  }
}
