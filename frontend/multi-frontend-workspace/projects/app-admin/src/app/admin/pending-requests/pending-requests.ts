import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PendingRequest } from './pending-request.model';
import { PendingRequestService } from './pending-request.service';

@Component({
  imports: [RouterLink],
  selector: 'app-pending-requests',
  styleUrl: './pending-requests.css',
  templateUrl: './pending-requests.html',
})
export class PendingRequests {
  pendingRequests: PendingRequest[] = [];

  constructor(private readonly pendingRequestService: PendingRequestService) {
    this.pendingRequestService.getPendingRequests().subscribe((requests) => {
      this.pendingRequests = requests;
    });
  }
}
