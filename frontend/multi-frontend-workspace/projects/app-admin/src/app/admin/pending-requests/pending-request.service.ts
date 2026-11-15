import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';
import { PendingRequest } from './pending-request.model';

interface PendingRequestApiRecord {
  organizationId: string;
  organizationName: string;
  organizationType: string;
  submitted: string;
  status: string;
  email: string;
  address: string;
  latitude: number;
  longitude: number;
  documentType: string;
  documentUrl: string;
  approvalRemarks: string | null;
}

interface PendingRequestsResponse {
  status_code: number;
  data?: {
    requests: PendingRequestApiRecord[];
  };
  message?: string;
}

export interface RejectRequestResponse {
  status_code: number;
  data?: {
    message: string;
    organizationId: string;
    status: string;
  };
  message?: string;
}

export interface ApproveRequestResponse {
  status_code: number;
  data?: {
    message: string;
    organizationId: string;
    status: string;
  };
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class PendingRequestService {
  private readonly http = inject(HttpClient);
  private requests: PendingRequest[] = [];

  getPendingRequests(adminId: string): Observable<PendingRequest[]> {
    return this.http
      .post<PendingRequestsResponse>('/api/admin/requests/list/', {
        adminId,
        status: 'pending',
        search: '',
      })
      .pipe(
        map((response) => {
          if (response.status_code !== 200 || !response.data?.requests) {
            throw new Error(response.message ?? 'Unable to get data.');
          }

          return response.data.requests.map((request) => ({
            id: request.organizationId,
            client: request.organizationName,
            type: this.formatOrganizationType(request.organizationType),
            submitted: request.submitted,
            status: this.formatLabel(request.status),
            email: request.email,
            address: request.address,
            latitude: request.latitude,
            longitude: request.longitude,
            approvalRemarks: request.approvalRemarks,
            documents: [
              {
                name: this.formatLabel(request.documentType),
                link: request.documentUrl,
              },
            ],
          }));
        }),
        tap((requests) => {
          this.requests = requests;
        }),
      );
  }

  getRequestById(id: string): Observable<PendingRequest | null> {
    return of(this.requests.find((request) => request.id === id) ?? null);
  }

  rejectRequest(
    organizationId: string,
    reason: string,
  ): Observable<RejectRequestResponse> {
    return this.http.post<RejectRequestResponse>(
      '/api/admin/requests/reject/',
      { organizationId, reason },
    );
  }

  approveRequest(
    organizationId: string,
    note: string,
  ): Observable<ApproveRequestResponse> {
    return this.http.post<ApproveRequestResponse>(
      '/api/admin/requests/approve/',
      { organizationId, note },
    );
  }

  private formatOrganizationType(value: string): string {
    return value.toLowerCase() === 'ngo' ? 'NGO' : this.formatLabel(value);
  }

  private formatLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
