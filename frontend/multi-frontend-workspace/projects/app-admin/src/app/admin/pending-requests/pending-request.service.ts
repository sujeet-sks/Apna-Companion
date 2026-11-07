import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PendingRequest } from './pending-request.model';

export interface RejectRequestResponse {
  status_code: number;
  data?: {
    message: string;
    requestId: string;
    status: string;
  };
  message?: string;
}

export interface ApproveRequestResponse {
  status_code: number;
  data?: {
    message: string;
    requestId: string;
    clientId: string;
    status: string;
  };
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class PendingRequestService {
  private readonly http = inject(HttpClient);

  private readonly requests: PendingRequest[] = [
    {
      id: 'request-a',
      client: 'Client A',
      type: 'NGO',
      city: 'Mumbai',
      submitted: 'Nov 8, 2026',
      documentsVerified: 3,
      documentsTotal: 5,
      status: 'Pending',
      registrationNumber: 'NGO-MH-2024-01842',
      contactName: 'Ananya Sharma',
      email: 'ananya.sharma@example.com',
      phone: '+91 98765 43210',
      address: '24 Seva Marg, Andheri East, Mumbai',
      description:
        'Community organization providing local support and companion services for people who need assistance with daily activities.',
      documents: [
        {
          name: 'Registration certificate',
          link: '/adminPortal/admin/requests/request-a/documents/registration-certificate',
        },
        {
          name: 'Organization PAN card',
          link: '/adminPortal/admin/requests/request-a/documents/organization-pan-card',
        },
        {
          name: 'Address proof',
          link: '/adminPortal/admin/requests/request-a/documents/address-proof',
        },
      ],
    },
    {
      id: 'request-b',
      client: 'Client B',
      type: 'Company',
      city: 'Pune',
      submitted: 'Nov 7, 2026',
      documentsVerified: 0,
      documentsTotal: 4,
      status: 'Pending',
      registrationNumber: 'CIN-U74999PN2024PTC224810',
      contactName: 'Rohan Deshmukh',
      email: 'rohan.deshmukh@example.com',
      phone: '+91 97654 32109',
      address: '6 Business Park, Shivajinagar, Pune',
      description:
        'Registered company applying to provide companion and assistance services in Pune.',
      documents: [
        {
          name: 'Certificate of incorporation',
          link: '/adminPortal/admin/requests/request-b/documents/certificate-of-incorporation',
        },
        {
          name: 'Company PAN card',
          link: '/adminPortal/admin/requests/request-b/documents/company-pan-card',
        },
        {
          name: 'Registered office proof',
          link: '/adminPortal/admin/requests/request-b/documents/registered-office-proof',
        },
        {
          name: 'Authorized representative ID',
          link: '/adminPortal/admin/requests/request-b/documents/representative-id',
        },
      ],
    },
    {
      id: 'request-c',
      client: 'Client C',
      type: 'NGO',
      city: 'Bengaluru',
      submitted: 'Nov 6, 2026',
      documentsVerified: 2,
      documentsTotal: 5,
      status: 'Possible duplicate',
      registrationNumber: 'NGO-KA-2023-00917',
      contactName: 'Meera Rao',
      email: 'meera.rao@example.com',
      phone: '+91 99887 76655',
      address: '18 Green Avenue, Indiranagar, Bengaluru',
      description:
        'Non-profit organization seeking to register its community assistance program on the platform.',
      documents: [
        {
          name: 'Registration certificate',
          link: '/adminPortal/admin/requests/request-c/documents/registration-certificate',
        },
        {
          name: 'Organization PAN card',
          link: '/adminPortal/admin/requests/request-c/documents/organization-pan-card',
        },
        {
          name: 'Address proof',
          link: '/adminPortal/admin/requests/request-c/documents/address-proof',
        },
      ],
    },
  ];

  getPendingRequests(): Observable<PendingRequest[]> {
    return of(this.requests);
  }

  getRequestById(id: string): Observable<PendingRequest | null> {
    return of(this.requests.find((request) => request.id === id) ?? null);
  }

  rejectRequest(requestId: string, reason: string): Observable<RejectRequestResponse> {
    return this.http.post<RejectRequestResponse>(
      '/adminPortal/admin/rejectRequest',
      { requestId, reason },
    );
  }

  approveRequest(requestId: string, remark: string): Observable<ApproveRequestResponse> {
    return this.http.post<ApproveRequestResponse>(
      '/adminPortal/admin/approveRequest',
      { requestId, remark },
    );
  }
}
