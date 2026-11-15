import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

interface BookingCompanion {
  name: string;
  phone: string;
  rating: number;
}

export interface PastBookingRecord {
  bookingId: string;
  status: 'completed' | 'rejected';
  service: string;
  organizationname: string;
  rating: number;
  companion: BookingCompanion;
  scheduletimestamp: string;
  durationOfBooking: string;
  comments?: string | null;
}

export interface CurrentBookingRecord {
  bookingId: string;
  status: string;
  serviceName: string;
  organizationname: string;
  rating: number;
  companion: BookingCompanion | null;
  scheduletimestamp: string;
  durationOfBooking: number | string;
  contactName: string;
  contactPhone: string;
  startOtp: string;
  endOtp: string;
}

interface BookingListResponse<T> {
  success?: number;
  message?: string;
  data?: T[];
}

@Component({
  imports: [FormsModule],
  selector: 'app-bookings',
  styleUrl: './bookings.css',
  templateUrl: './bookings.html',
})
export class Bookings implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly currentBookingsApiUrl =
    '/api/v1/customer/getCurrentBookingDetails/';
  private readonly pastBookingsApiUrl =
    '/api/v1/customer/getAllBookingDetails/';
  private readonly submitReviewApiUrl =
    '/api/v1/customer/submitReview/';

  organizationRatings: Record<string, number> = {};
  companionRatings: Record<string, number> = {};
  reviewComments: Record<string, string> = {};
  isSubmittingReview: Record<string, boolean> = {};
  reviewStatus: Record<string, string> = {};

  readonly pastBookingRecords = signal<PastBookingRecord[]>([]);
  readonly currentBookingRecords = signal<CurrentBookingRecord[]>([]);
  readonly pastBookingsError = signal('');
  readonly currentBookingsError = signal('');
  readonly isLoadingPastBookings = signal(false);
  readonly isLoadingCurrentBookings = signal(false);

  formatBookingDate(scheduletimestamp: string): string {
    const date = new Date(scheduletimestamp);
    if (Number.isNaN(date.getTime())) return scheduletimestamp;

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  formatBookingTime(scheduletimestamp: string): string {
    const date = new Date(scheduletimestamp);
    if (Number.isNaN(date.getTime())) return scheduletimestamp;

    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  formatCurrentBookingStatus(status: string): string {
    const formattedStatus = status.replace(/_/g, ' ');
    return formattedStatus.charAt(0).toUpperCase() + formattedStatus.slice(1);
  }

  setOrganizationRating(bookingId: string, rating: number): void {
    this.organizationRatings[bookingId] = rating;
  }

  setCompanionRating(bookingId: string, rating: number): void {
    this.companionRatings[bookingId] = rating;
  }

  canSubmitReview(bookingId: string): boolean {
    return (
      (this.organizationRatings[bookingId] ?? 0) > 0 &&
      (this.companionRatings[bookingId] ?? 0) > 0 &&
      (this.reviewComments[bookingId] ?? '').trim().length > 0
    );
  }

  submitReview(bookingId: string): void {
    if (!this.canSubmitReview(bookingId) || this.isSubmittingReview[bookingId]) {
      return;
    }

    const requestPayload = {
      userID: this.getUserId(),
      bookingId,
      organizationRating: this.organizationRatings[bookingId],
      companionRating: this.companionRatings[bookingId],
      Comment: (this.reviewComments[bookingId] ?? '').trim(),
    };

    this.isSubmittingReview[bookingId] = true;
    this.reviewStatus[bookingId] = '';

    this.http.post<unknown>(this.submitReviewApiUrl, requestPayload).subscribe({
      next: () => {
        this.reviewStatus[bookingId] = 'Review submitted successfully.';
        this.pastBookingRecords.update((records) =>
          records.map((record) =>
            record.bookingId === bookingId
              ? { ...record, comments: requestPayload.Comment }
              : record,
          ),
        );
      },
      error: () => {
        this.reviewStatus[bookingId] =
          'Unable to submit the review. Please try again.';
      },
    }).add(() => {
      this.isSubmittingReview[bookingId] = false;
    });
  }

  ngOnInit(): void {
    this.loadCurrentBookings();
    this.loadPastBookings();
  }

  private getUserId(): string {
    if (typeof window === 'undefined') return '';

    return (
      window.sessionStorage.getItem('customer_id') ??
      window.sessionStorage.getItem('userID') ??
      window.sessionStorage.getItem('userId') ??
      ''
    );
  }

  private loadCurrentBookings(): void {
    this.isLoadingCurrentBookings.set(true);
    this.http
      .post<BookingListResponse<CurrentBookingRecord> | CurrentBookingRecord[]>(
        this.currentBookingsApiUrl,
        { userID: this.getUserId() },
      )
      .pipe(finalize(() => this.isLoadingCurrentBookings.set(false)))
      .subscribe({
        next: (response) => {
          if (
            !Array.isArray(response) &&
            response.success !== undefined &&
            response.success !== 200
          ) {
            this.currentBookingRecords.set([]);
            this.currentBookingsError.set(
              response.message || 'Unable to load current bookings.',
            );
            return;
          }

          const records = Array.isArray(response)
            ? response
            : response.data;

          if (!Array.isArray(records)) {
            this.currentBookingRecords.set([]);
            this.currentBookingsError.set(
              'Unable to load current bookings: the response was incomplete.',
            );
            return;
          }

          this.currentBookingRecords.set(records);
          this.currentBookingsError.set('');
        },
        error: (error: HttpErrorResponse) => {
          this.currentBookingRecords.set([]);
          this.currentBookingsError.set(
            error.error?.message ?? 'Unable to load current bookings. Please try again.',
          );
        },
      });
  }

  private loadPastBookings(): void {
    this.isLoadingPastBookings.set(true);
    this.http
      .post<BookingListResponse<PastBookingRecord> | PastBookingRecord[]>(
        this.pastBookingsApiUrl,
        { userID: this.getUserId() },
      )
      .pipe(finalize(() => this.isLoadingPastBookings.set(false)))
      .subscribe({
        next: (response) => {
          if (
            !Array.isArray(response) &&
            response.success !== undefined &&
            response.success !== 200
          ) {
            this.pastBookingRecords.set([]);
            this.pastBookingsError.set(
              response.message || 'Unable to load past bookings.',
            );
            return;
          }

          const records = Array.isArray(response)
            ? response
            : response.data;

          if (Array.isArray(records)) {
            this.pastBookingRecords.set(records);
            this.pastBookingsError.set('');
            return;
          }

          this.pastBookingRecords.set([]);
          this.pastBookingsError.set(
            'Unable to load past bookings: the response was incomplete.',
          );
        },
        error: (error: HttpErrorResponse) => {
          this.pastBookingRecords.set([]);
          this.pastBookingsError.set(
            error.error?.message ?? 'Unable to load past bookings. Please try again.',
          );
        },
      });
  }
}
