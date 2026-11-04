import { Component, inject, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

interface ClientInfo {
  [key: string]: unknown;
}

interface GetAllClientsResponse {
  status_code?: number;
  data?: unknown;
  clients?: ClientInfo[];
  message?: string;
}

@Component({
  selector: 'app-clients',
  styleUrl: './clients.css',
  templateUrl: './clients.html',
})
export class Clients implements OnInit {
  private readonly http = inject(HttpClient);

  protected clients: ClientInfo[] = [];
  protected isLoading = false;
  protected errorMessage = '';

  ngOnInit(): void {
    this.getAllClients();
  }

  protected getAllClients(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http
      .post<GetAllClientsResponse>(
        '/adminPortal/admin/getAllClientsInfo',
        {},
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          if (Array.isArray(response.data)) {
            this.clients = response.data as ClientInfo[];
          } else if (
            response.data &&
            typeof response.data === 'object' &&
            Array.isArray((response.data as { clients?: ClientInfo[] }).clients)
          ) {
            this.clients = (
              response.data as { clients: ClientInfo[] }
            ).clients;
          } else {
            this.clients = response.clients ?? [];
          }
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage =
            error.error?.message ?? 'Unable to load client information.';
        },
      });
  }
}
