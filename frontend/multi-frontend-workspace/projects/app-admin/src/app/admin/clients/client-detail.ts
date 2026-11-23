import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ClientDetailField,
  ClientInfo,
  formatDocumentType,
  getClientDetailFields,
} from './client.model';
import { ClientService } from './client.service';

@Component({
  imports: [RouterLink],
  selector: 'app-client-detail',
  styleUrl: './client-detail.css',
  templateUrl: './client-detail.html',
})
export class ClientDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clientService = inject(ClientService);

  protected readonly client = signal<ClientInfo | null>(null);
  protected readonly fields = signal<ClientDetailField[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly formatDocumentType = formatDocumentType;

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('clientId');
    if (!clientId) {
      this.errorMessage.set('A client ID was not provided.');
      this.isLoading.set(false);
      return;
    }

    this.clientService
      .getClientById(clientId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (client) => {
          this.client.set(client);
          this.fields.set(client ? getClientDetailFields(client) : []);
        },
        error: () => this.errorMessage.set('Unable to get client data.'),
      });
  }
}
