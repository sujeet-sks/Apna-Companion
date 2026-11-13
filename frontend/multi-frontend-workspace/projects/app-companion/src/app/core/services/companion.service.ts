import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface CompanionDashboardSummary {
  active_count: number;
  past_count: number;
}

export interface CompanionBooking {
  id: number;
  service_name: string;
  customer_name: string;
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

  async activeBookings(): Promise<CompanionBooking[]> {
    const response = await this.get<{ items: CompanionBooking[] }>(
      `${API_BASE_URL}/companion/bookings/active/?page=1&page_size=5`,
    );
    return response.items;
  }

  profile(): Promise<CompanionProfile> {
    return this.get(`${API_BASE_URL}/companion/profile/`);
  }

  private async get<T>(url: string): Promise<T> {
    try {
      const response = await firstValueFrom(this.http.get<ApiResponse<T>>(url));
      if (!response || !('data' in response)) {
        throw new Error('The server returned an unexpected response.');
      }
      return response.data;
    } catch (error) {
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
