import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
  comments?: string;
}

export interface CurrentBookingRecord {
  bookingId: string;
  status: 'pending' | 'accepted' | 'completed';
  serviceName: string;
  organizationname: string;
  rating: number;
  companion: BookingCompanion;
  scheduletimestamp: string;
  durationOfBooking: string;
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
    '/api/v1/customer/getAllBookingDetails/';
  private readonly pastBookingsApiUrl =
    '/api/v1/customer/getCurrentBookingDetails/';
  private readonly submitReviewApiUrl =
    '/api/v1/customer/submitReview/';

  organizationRatings: Record<string, number> = {};
  companionRatings: Record<string, number> = {};
  reviewComments: Record<string, string> = {};
  isSubmittingReview: Record<string, boolean> = {};
  reviewStatus: Record<string, string> = {};

  pastBookingRecords: PastBookingRecord[] = [
    {
      bookingId: 'PST-101',
      status: 'completed',
      service: 'OPD visit companion',
      organizationname: 'Sahara Care Foundation',
      rating: 4.6,
      companion: {
        name: 'Priya S.',
        phone: '9876543210',
        rating: 4.8,
      },
      scheduletimestamp: '2026-11-25T10:00:00+05:30',
      durationOfBooking: '2 hours',
      comments: 'The companion was punctual and very helpful.',
    },
    {
      bookingId: 'PST-102',
      status: 'completed',
      service: 'Temple visit companion',
      organizationname: 'Helping Hands Network',
      rating: 4.5,
      companion: {
        name: 'Anita R.',
        phone: '9876501234',
        rating: 4.7,
      },
      scheduletimestamp: '2026-11-20T08:30:00+05:30',
      durationOfBooking: '3 hours',
      comments: 'Good support throughout the visit.',
    },
    {
      bookingId: 'PST-103',
      status: 'rejected',
      service: 'Bank assistance',
      organizationname: 'CareNest Companion Services',
      rating: 4.8,
      companion: {
        name: 'Rahul M.',
        phone: '9876512345',
        rating: 4.6,
      },
      scheduletimestamp: '2026-11-18T11:00:00+05:30',
      durationOfBooking: '1 hour',
      comments: 'No companion was available at the requested time.',
    },
    {
      bookingId: 'PST-104',
      status: 'completed',
      service: 'Shopping companion',
      organizationname: 'Helping Hands Network',
      rating: 4.5,
      companion: {
        name: 'Meena K.',
        phone: '9876523456',
        rating: 4.9,
      },
      scheduletimestamp: '2026-11-14T16:00:00+05:30',
      durationOfBooking: '2 hours',
      comments: 'Very patient and helpful.',
    },
    {
      bookingId: 'PST-105',
      status: 'completed',
      service: 'Park outing companion',
      organizationname: 'Sahara Care Foundation',
      rating: 4.6,
      companion: {
        name: 'Priya S.',
        phone: '9876543210',
        rating: 4.8,
      },
      scheduletimestamp: '2026-11-10T07:30:00+05:30',
      durationOfBooking: '1 hour',
      comments: 'Comfortable and enjoyable outing.',
    },
  ];

  currentBookingRecords: CurrentBookingRecord[] = [
    {
      bookingId: '',
      status: 'pending',
      serviceName: 'OPD vist',
      organizationname: 'Sahara Care Foundation',
      rating: 4.6,
      companion: {
        name: 'Priya S.',
        phone: '9876543210',
        rating: 4.8,
      },
      scheduletimestamp: '2026-11-25T10:00:00+05:30',
      durationOfBooking: '',
      startOtp: '7888',
      endOtp: '44445',
    },
    {
      bookingId: '',
      status: 'completed',
      serviceName: '',
      organizationname: 'Sahara Care Foundation',
      rating: 4.6,
      companion: {
        name: 'Priya S.',
        phone: '9876543210',
        rating: 4.8,
      },
      scheduletimestamp: '2026-11-25T10:00:00+05:30',
      durationOfBooking: '',
      startOtp: '7888',
      endOtp: '44445',
    },
  ];

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
    // this.loadPastBookings();
  }

  private getUserId(): string {
    if (typeof window === 'undefined') return '';

    return (
      window.localStorage.getItem('userID') ??
      window.localStorage.getItem('userId') ??
      ''
    );
  }

  private loadCurrentBookings(): void {

    this.http
      .post<BookingListResponse<CurrentBookingRecord> | CurrentBookingRecord[]>(
        this.currentBookingsApiUrl,
        { userID: this.getUserId() },
      )
      .subscribe({
        next: (response) => {

          const records = Array.isArray(response)
            ? response
            : response.data;

          if (Array.isArray(records)) {
            this.currentBookingRecords = records;
          }
        },
      });
  }

  private loadPastBookings(): void {
    this.http
      .post<BookingListResponse<PastBookingRecord> | PastBookingRecord[]>(
        this.pastBookingsApiUrl,
        { userID: this.getUserId() },
      )
      .subscribe({
        next: (response) => {
          const records = Array.isArray(response)
            ? response
            : response.data;

          if (Array.isArray(records)) {
            this.pastBookingRecords = records;
          }
        },
      });
  }
}
