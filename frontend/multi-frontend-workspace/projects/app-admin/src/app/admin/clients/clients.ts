import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  clientTableColumns,
  ClientInfo,
  formatClientValue,
  getClientId,
} from './client.model';
import { ClientService } from './client.service';

@Component({
  imports: [RouterLink],
  selector: 'app-clients',
  styleUrl: './clients.css',
  templateUrl: './clients.html',
})
export class Clients implements OnInit {
  private readonly clientService = inject(ClientService);

  protected readonly clients = signal<ClientInfo[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly columns = clientTableColumns;
  protected readonly getClientId = getClientId;
  protected readonly formatClientValue = formatClientValue;

  ngOnInit(): void {
    this.clientService
      .getClients()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (clients) => this.clients.set(clients),
        error: () => this.errorMessage.set('Unable to get client data.'),
      });
  }
}
