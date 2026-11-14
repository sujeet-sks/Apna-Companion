import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface OrganizationDashboardSummary {
  companions_total: number;
  pending_bookings: number;
  active_bookings: number;
}

export interface OrganizationProfile {
  organization_id: string;
  organization_name: string;
  organization_type: string;
  email: string;
  address: string;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  document_type: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  approval_remarks: string | null;
  is_active: boolean;
}

export interface OrganizationBooking {
  id: number;
  service_id: number;
  service_name: string;
  customer_name: string;
  status: string;
  scheduled_at: string;
  duration: number;
  price_inr: string;
  pickup_address: string | null;
  latitude: number | null;
  longitude: number | null;
  companion_id: string | null;
  companion_name: string | null;
}

export interface EligibleCompanion {
  companion_id: string;
  name: string;
}

export interface OrganizationCompanion {
  companion_id: string;
  name: string;
  is_active: boolean;
  availability_status: 'available' | 'unavailable' | 'busy';
}

export interface OrganizationCompanionPage {
  items: OrganizationCompanion[];
  total: number;
  page: number;
  page_size: number;
}

export interface OrganizationServiceOption {
  id: number;
  name: string;
  price_inr: string;
  is_active: boolean;
}

export interface CreateOrganizationServiceInput {
  name: string;
  price_inr: string;
}

export interface CreateCompanionInput {
  name: string;
  email: string;
  mobile: string;
  service_ids: number[];
  languages_known: string[];
  dob?: string;
  gender?: string;
  address?: string;
  identity_proof_url?: string;
  photo_url?: string;
  speciality?: string;
  experience_years?: number;
}

interface ApiResponse<T> {
  data: T;
}

const API_BASE_URL = 'http://localhost:8000/api/v1';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);

  dashboard(): Promise<OrganizationDashboardSummary> {
    return this.get(`${API_BASE_URL}/org/dashboard/`);
  }

  profile(): Promise<OrganizationProfile> {
    return this.get(`${API_BASE_URL}/org/profile/`);
  }

  updateProfile(input: {
    address: string;
    logo_url: string | null;
    latitude: number;
    longitude: number;
  }): Promise<{ message: string }> {
    return this.patch(`${API_BASE_URL}/org/profile/`, input);
  }

  async recentBookings(): Promise<OrganizationBooking[]> {
    const response = await this.get<{
      items: OrganizationBooking[];
    }>(`${API_BASE_URL}/org/bookings/?page=1&page_size=5`);
    return response.items;
  }

  acceptBooking(bookingId: number): Promise<{ id: number; status: string }> {
    return this.post(`${API_BASE_URL}/org/bookings/${bookingId}/accept/`);
  }

  eligibleCompanions(bookingId: number): Promise<{ items: EligibleCompanion[] }> {
    return this.get(`${API_BASE_URL}/org/bookings/${bookingId}/eligible-companions/`);
  }

  assignBooking(
    bookingId: number,
    companionId: string,
  ): Promise<{ id: number; companion_id: string; status: string }> {
    return this.post(`${API_BASE_URL}/org/bookings/${bookingId}/assign/`, {
      companion_id: companionId,
    });
  }

  async services(): Promise<OrganizationServiceOption[]> {
    const response = await this.get<{ items: OrganizationServiceOption[] }>(
      `${API_BASE_URL}/org/services/?page=1&page_size=50`,
    );
    return response.items;
  }

  createService(input: CreateOrganizationServiceInput): Promise<{
    id: number;
    is_active: boolean;
  }> {
    return this.post(`${API_BASE_URL}/org/services/`, input);
  }

  updateServiceStatus(serviceId: number, isActive: boolean): Promise<{ message: string }> {
    return this.patch(`${API_BASE_URL}/org/services/${serviceId}/status/`, {
      is_active: isActive,
    });
  }

  companions(input: {
    page: number;
    pageSize: number;
    search?: string;
    availability?: string;
  }): Promise<OrganizationCompanionPage> {
    const params = new URLSearchParams({
      page: String(input.page),
      page_size: String(input.pageSize),
    });
    if (input.search) params.set('search', input.search);
    if (input.availability) params.set('availability_status', input.availability);
    return this.get(`${API_BASE_URL}/org/companions/?${params.toString()}`);
  }

  createCompanion(input: CreateCompanionInput): Promise<{
    companion_id: string;
    email: string;
    message: string;
  }> {
    return this.post(`${API_BASE_URL}/org/companions/`, input);
  }

  private async post<T>(url: string, body: object | null = null): Promise<T> {
    try {
      const response = await firstValueFrom(this.http.post<ApiResponse<T>>(url, body));
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

  private async patch<T>(url: string, body: object): Promise<T> {
    try {
      const response = await firstValueFrom(this.http.patch<ApiResponse<T>>(url, body));
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
