import { Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PendingRequest } from './pending-request.model';
import {
  ApproveRequestResponse,
  PendingRequestService,
  RejectRequestResponse,
} from './pending-request.service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-request-detail',
  styleUrl: './request-detail.css',
  templateUrl: './request-detail.html',
})
export class RequestDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pendingRequestService = inject(PendingRequestService);

  protected request: PendingRequest | null = null;
  protected isLoading = true;
  protected remark = '';
  protected isApproving = false;
  protected isRejecting = false;
  protected actionMessage = '';
  protected actionError = false;

  ngOnInit(): void {
    const requestId = this.route.snapshot.paramMap.get('requestId');

    if (!requestId) {
      this.isLoading = false;
      return;
    }

    this.pendingRequestService.getRequestById(requestId).subscribe((request) => {
      this.request = request;
      this.isLoading = false;
    });
  }

  protected rejectRequest(requestId: string): void {
    const reason = this.remark.trim();
    if (!reason) {
      this.actionMessage = 'Please enter a remark before rejecting this request.';
      this.actionError = true;
      return;
    }

    this.isRejecting = true;
    this.actionMessage = '';
    this.actionError = false;

    this.pendingRequestService.rejectRequest(requestId, reason).subscribe({
      next: (response: RejectRequestResponse) => {
        this.isRejecting = false;

        if (response.status_code !== 200 || !response.data) {
          this.actionMessage =
            response.message ?? 'The request could not be rejected.';
          this.actionError = true;
          return;
        }

        if (this.request) {
          this.request = { ...this.request, status: response.data.status };
        }
        this.actionMessage = response.data.message;
      },
      error: (error: HttpErrorResponse) => {
        this.isRejecting = false;
        this.actionMessage = this.getRequestActionErrorMessage(error, 'reject');
        this.actionError = true;
      },
    });
  }

  protected approveRequest(requestId: string): void {
    const remark = this.remark.trim();
    if (!remark) {
      this.actionMessage = 'Please enter a remark before approving this request.';
      this.actionError = true;
      return;
    }

    this.isApproving = true;
    this.actionMessage = '';
    this.actionError = false;

    this.pendingRequestService.approveRequest(requestId, remark).subscribe({
      next: (response: ApproveRequestResponse) => {
        this.isApproving = false;

        if (response.status_code !== 200 || !response.data) {
          this.actionMessage =
            response.message ?? 'The request could not be approved.';
          this.actionError = true;
          return;
        }

        if (this.request) {
          this.request = { ...this.request, status: response.data.status };
        }
        this.actionMessage = `${response.data.message} Client ID: ${response.data.clientId}.`;
      },
      error: (error: HttpErrorResponse) => {
        this.isApproving = false;
        this.actionMessage = this.getRequestActionErrorMessage(error, 'approve');
        this.actionError = true;
      },
    });
  }

  private getRequestActionErrorMessage(
    error: HttpErrorResponse,
    action: 'approve' | 'reject',
  ): string {
    const serverMessage =
      typeof error.error?.message === 'string' ? error.error.message : '';

    if (serverMessage) {
      return serverMessage;
    }

    switch (error.status) {
      case 400:
        return action === 'reject'
          ? 'A request ID and remark are required.'
          : 'A request ID is required.';
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return `You are not allowed to ${action} requests.`;
      case 404:
        return 'This request could not be found.';
      case 409:
        return 'This request is no longer pending.';
      default:
        return `Unable to ${action} the request. Please try again.`;
    }
  }
}
