import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TimeoutError, firstValueFrom, timeout } from 'rxjs';
import { AuthService } from './auth.service';

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
  organization_rating: number | null;
  customer_comment: string | null;
  latitude: number | null;
  longitude: number | null;
  companion_id: string | null;
  companion_name: string | null;
}

export interface OrganizationBookingPage {
  items: OrganizationBooking[];
  total: number;
  page: number;
  page_size: number;
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

export interface OrganizationCompanionDetails extends OrganizationCompanion {
  email: string;
  mobile: string;
  organization_id: string;
  languages_known: string[];
  speciality: string | null;
  experience_years: number | null;
  service_ids: number[];
  service_names: string[];
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

interface LoadedOrganizationData {
  summary?: OrganizationDashboardSummary;
  companionTotal?: number;
  companionPages?: Map<number, OrganizationCompanion[]>;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);

  private readonly auth = inject(AuthService);
  private readonly loaded = signal<{
    session: ReturnType<AuthService['session']>;
    data: LoadedOrganizationData;
  } | null>(null);

  readonly dashboardCounts = computed(() => {
    const loaded = this.loaded();
    const data = loaded?.session === this.auth.session() ? loaded?.data : undefined;
    const companions = new Map<string, OrganizationCompanion>();
    for (const page of data?.companionPages?.values() ?? []) {
      for (const companion of page) {
        companions.set(companion.companion_id, companion);
      }
    }
    const allCompanionsLoaded = data?.companionTotal === companions.size;
    return {
      servicesInProgress: data?.summary?.active_bookings,
      companionsEmployed: data?.companionTotal ?? data?.summary?.companions_total,
      companionsBusy: allCompanionsLoaded
        ? [...companions.values()].filter((companion) => companion.is_active && companion.availability_status === 'busy').length
        : undefined,
      companionsAvailable: allCompanionsLoaded
        ? [...companions.values()].filter((companion) => companion.is_active && companion.availability_status === 'available').length
        : undefined,
    };
  });

  private updateLoaded(
    session: ReturnType<AuthService['session']>,
    update: (data: LoadedOrganizationData) => LoadedOrganizationData,
  ): void {
    if (!session || session !== this.auth.session()) return;
    this.loaded.update((loaded) => ({
      session,
      data: update(loaded?.session === session ? loaded.data : {}),
    }));
  }

  async dashboard(): Promise<OrganizationDashboardSummary> {
    const session = this.auth.session();
    const summary = await this.get<OrganizationDashboardSummary>(`${API_BASE_URL}/org/dashboard/`);
    this.updateLoaded(session, (data) => ({ ...data, summary }));
    return summary;
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

  async allBookings(): Promise<OrganizationBooking[]> {
    const firstPage = await this.get<OrganizationBookingPage>(
      `${API_BASE_URL}/org/bookings/?page=1&page_size=50`,
    );
    const bookings = [...firstPage.items];
    const pageCount = Math.ceil(firstPage.total / firstPage.page_size);

    for (let page = 2; page <= pageCount; page += 1) {
      const response = await this.get<OrganizationBookingPage>(
        `${API_BASE_URL}/org/bookings/?page=${page}&page_size=${firstPage.page_size}`,
      );
      bookings.push(...response.items);
    }

    return bookings;
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
    return (await this.servicePage(1)).items;
  }

  private servicePage(page: number) {
    return this.get<{ items: OrganizationServiceOption[]; total: number; page_size: number }>(
      `${API_BASE_URL}/org/services/?page=${page}&page_size=50`,
    );
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

  updateCompanionStatus(
    companionId: string,
    status: { is_active: boolean } | { availability_status: 'available' | 'unavailable' },
  ): Promise<{ message: string }> {
    return this.patch(
      `${API_BASE_URL}/org/companions/${encodeURIComponent(companionId)}/status/`,
      status,
    );
  }

  async companions(input: {
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
    const session = this.auth.session();
    const result = await this.get<OrganizationCompanionPage>(
      `${API_BASE_URL}/org/companions/?${params.toString()}`,
    );
    if (!input.search && !input.availability) {
      this.updateLoaded(session, (data) => {
        const companionPages = new Map(
          result.page === 1 || result.total !== data.companionTotal ? undefined : data.companionPages,
        );
        companionPages.set(result.page, result.items);
        return { ...data, companionPages, companionTotal: result.total };
      });
    }
    return result;
  }

  async companionDetails(companionId: string): Promise<OrganizationCompanionDetails> {
    const details = await this.get<Omit<OrganizationCompanionDetails, 'service_names'>>(
      `${API_BASE_URL}/org/companions/${encodeURIComponent(companionId)}/`,
    );
    const remainingIds = new Set(details.service_ids);
    const namesById = new Map<number, string>();
    for (let page = 1; remainingIds.size; page++) {
      const result = await this.servicePage(page);
      for (const service of result.items) {
        if (remainingIds.delete(service.id)) {
          namesById.set(service.id, service.name);
        }
      }
      if (page * result.page_size >= result.total) break;
    }
    return {
      ...details,
      service_names: details.service_ids.map((id) => namesById.get(id) ?? 'Unknown service'),
    };
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
      const response = await firstValueFrom(
        this.http.get<ApiResponse<T>>(url).pipe(timeout(15_000)),
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
