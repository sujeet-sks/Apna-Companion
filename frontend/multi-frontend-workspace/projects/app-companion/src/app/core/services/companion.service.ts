import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, TimeoutError, firstValueFrom, timeout } from 'rxjs';

export interface CompanionDashboardSummary {
  active_count: number;
  past_count: number;
}

export interface CompanionBooking {
  id: number;
  service_name: string;
  customer_name: string;
  pickup_contact_name: string | null;
  pickup_contact_phone: string | null;
  organization_name: string;
  status: 'assigned' | 'on_the_way' | 'arrived' | 'in_progress';
  scheduled_at: string;
  duration: number;
  price_inr: string;
  service_notes: string | null;
  pickup_address: string | null;  
  latitude: number | null;
  longitude: number | null;
}

export interface CompanionBookingPage {
  items: CompanionBooking[];
  total: number;
  page: number;
  page_size: number;
}

export interface CompanionBookingDetails {
  id: number;
  organization_id: string;
  customer_name: string;
  service_id: number;
  service_name: string;
  status: CompanionBooking['status'] | 'completed' | 'cancelled';
  scheduled_at: string;
  duration: number;
  price_inr: string;
  service_notes: string | null;
  pickup_address: string | null;
  latitude: number | null;
  longitude: number | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  assigned_at: string | null;
  cancelled_by: string | null;
  companion_rating?: number | null;
  customer_comment?: string | null;
}

export interface CompanionPastJourney {
  id: number;
  service_name: string;
  status: 'completed' | 'cancelled';
  scheduled_at: string;
  cancellation_reason: string | null;
  companion_rating?: number | null;
  customer_comment?: string | null;
}

export interface CompanionJourneyHistory {
  items: CompanionPastJourney[];
  total: number;
  page: number;
  page_size: number;
}

export interface CompanionProfile {
  companion_id: string;
  name: string;
  email: string;
  mobile: string;
  dob: string | null;
  gender: string | null;
  address: string | null;
  photo_url: string | null;
  speciality: string | null;
  experience_years: number | null;
  languages_known: string[];
  is_active: boolean;
  availability_status: string;
  organization: {
    organization_id: string;
    organization_name: string;
    email: string;
    address: string;
    logo_url: string | null;
  };
}

interface ApiResponse<T> {
  data: T;
}

const API_BASE_URL = 'http://localhost:8000/api/v1';

@Injectable({ providedIn: 'root' })
export class CompanionService {
  private readonly http = inject(HttpClient);

  dashboard(): Promise<CompanionDashboardSummary> {
    return this.get(`${API_BASE_URL}/companion/dashboard/`);
  }

  activeBookings(page = 1, pageSize = 10): Promise<CompanionBookingPage> {
    return this.get(
      `${API_BASE_URL}/companion/bookings/active/?page=${page}&page_size=${pageSize}`,
    );
  }

  bookingDetails(bookingId: number): Promise<CompanionBookingDetails> {
    return this.get(`${API_BASE_URL}/companion/bookings/${bookingId}/`);
  }

  updateBookingStatus(
    bookingId: number,
    status: 'on_the_way' | 'arrived',
  ): Promise<{ id: number; status: string }> {
    return this.patch(`${API_BASE_URL}/companion/bookings/${bookingId}/status/`, { status });
  }

  startBooking(
    bookingId: number,
    startCode: string,
  ): Promise<{ id: number; status: string; started_at: string }> {
    return this.post(`${API_BASE_URL}/companion/bookings/${bookingId}/start/`, {
      start_code: startCode,
    });
  }

  completeBooking(
    bookingId: number,
    endCode: string,
  ): Promise<{ id: number; status: string; completed_at: string }> {
    return this.post(`${API_BASE_URL}/companion/bookings/${bookingId}/complete/`, {
      end_code: endCode,
    });
  }

  pastJourneys(page: number, pageSize = 10): Promise<CompanionJourneyHistory> {
    return this.get(
      `${API_BASE_URL}/companion/bookings/history/?page=${page}&page_size=${pageSize}`,
    );
  }

  profile(): Promise<CompanionProfile> {
    return this.get(`${API_BASE_URL}/companion/profile/`);
  }

  private get<T>(url: string): Promise<T> {
    return this.request(this.http.get<ApiResponse<T>>(url));
  }

  private post<T>(url: string, body: object): Promise<T> {
    return this.request(this.http.post<ApiResponse<T>>(url, body));
  }

  private patch<T>(url: string, body: object): Promise<T> {
    return this.request(this.http.patch<ApiResponse<T>>(url, body));
  }

  private async request<T>(request: Observable<ApiResponse<T>>): Promise<T> {
    try {
      const response = await firstValueFrom(
        request.pipe(timeout(15_000)),
      );
      if (!response || !('data' in response)) {
        throw new Error('The server returned an unexpected response.');
      }
      return response.data;
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new Error('The API took too long to respond. Please try again.');
      }
      if (error instanceof HttpErrorResponse) {
        if (error.status === 0) {
          throw new Error('Unable to reach the API at http://localhost:8000.');
        }
        const body = error.error as { message?: unknown; detail?: unknown } | null;
        const message = body?.message ?? body?.detail;
        throw new Error(
          typeof message === 'string' ? message : `The request failed (${error.status}).`,
        );
      }
      throw error;
    }
  }
}
