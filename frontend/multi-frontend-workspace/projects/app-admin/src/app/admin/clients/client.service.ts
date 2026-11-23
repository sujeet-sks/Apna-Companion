import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';
import { ClientInfo } from './client.model';

interface ClientListResponse {
  status_code: number;
  data?: {
    organizations: ClientInfo[];
  };
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private clients: ClientInfo[] = [];

  getClients(): Observable<ClientInfo[]> {
    return this.http
      .post<ClientListResponse>('/api/admin/organization/list/', {
        status: 'all',
        search: '',
      })
      .pipe(
        map((response) => {
          if (response.status_code !== 200 || !response.data?.organizations) {
            throw new Error(response.message ?? 'Unable to get client data.');
          }

          return response.data.organizations;
        }),
        tap((clients) => {
          this.clients = clients;
        }),
      );
  }

  getClientById(clientId: string): Observable<ClientInfo | null> {
    const cachedClient = this.clients.find(
      (client) => client.organizationId === clientId,
    );
    if (cachedClient) {
      return of(cachedClient);
    }

    return this.getClients().pipe(
      map(
        (clients) =>
          clients.find((client) => client.organizationId === clientId) ?? null,
      ),
    );
  }
}
