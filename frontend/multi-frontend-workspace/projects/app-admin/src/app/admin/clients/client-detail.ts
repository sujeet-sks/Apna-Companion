import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  clientData,
  ClientDetailField,
  ClientInfo,
  ClientStatistics,
  getClientId,
  getClientDetailFields,
  isClientStatistics,
} from './client.model';

@Component({
  imports: [RouterLink],
  selector: 'app-client-detail',
  styleUrl: './client-detail.css',
  templateUrl: './client-detail.html',
})
export class ClientDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);

  protected client: ClientInfo | null = null;
  protected fields: ClientDetailField[] = [];
  protected statistics: ClientStatistics | null = null;
  protected bookingOutcomeTotal = 0;
  protected isLoading = false;
  protected errorMessage = '';

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('clientId');
    if (!clientId) {
      this.errorMessage = 'A client ID was not provided.';
      return;
    }

    this.client =
      clientData.approvedClients.find((client) => getClientId(client) === clientId) ??
      null;
    this.fields = this.client ? getClientDetailFields(this.client) : [];
    const statistics = this.client?.['statistics'];
    if (isClientStatistics(statistics)) {
      this.statistics = statistics;
      const outcomes = this.statistics.bookingOutcomes;
      this.bookingOutcomeTotal =
        outcomes.completed + outcomes.cancelled + outcomes.upcoming;
    }
  }

  protected getOutcomeWidth(count: number): number {
    return this.bookingOutcomeTotal > 0
      ? (count / this.bookingOutcomeTotal) * 100
      : 0;
  }
}
