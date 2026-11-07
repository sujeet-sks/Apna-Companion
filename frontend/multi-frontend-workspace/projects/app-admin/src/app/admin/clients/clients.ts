import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  clientTableColumns,
  clientData,
  ClientInfo,
  formatClientValue,
  getClientId,
} from './client.model';

@Component({
  imports: [RouterLink],
  selector: 'app-clients',
  styleUrl: './clients.css',
  templateUrl: './clients.html',
})
export class Clients {
  protected clients: ClientInfo[] = clientData.approvedClients;
  protected readonly columns = clientTableColumns;
  protected readonly getClientId = getClientId;
  protected readonly formatClientValue = formatClientValue;
}
