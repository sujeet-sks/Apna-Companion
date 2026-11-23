import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PendingRequest } from './pending-request.model';
import { ToastService } from '../../shared/toast.service';
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
  private readonly router = inject(Router);
  private readonly pendingRequestService = inject(PendingRequestService);
  private readonly toast = inject(ToastService);

  protected request: PendingRequest | null = null;
  protected isLoading = true;
  protected remark = '';
  protected readonly isApproving = signal(false);
  protected readonly isRejecting = signal(false);
  protected readonly actionMessage = signal('');
  protected readonly actionError = signal(false);

  ngOnInit(): void {
    const requestId = this.route.snapshot.paramMap.get('requestId');

    if (!requestId) {
      void this.router.navigate(['/admin/pending-requests'], {
        replaceUrl: true,
      });
      return;
    }

    this.pendingRequestService.getRequestById(requestId).subscribe((request) => {
      if (!request) {
        void this.router.navigate(['/admin/pending-requests'], {
          replaceUrl: true,
        });
        return;
      }

      this.request = request;
      this.isLoading = false;
    });
  }

  protected rejectRequest(requestId: string): void {
    const reason = this.remark.trim();
    if (!reason) {
      this.actionMessage.set('Please enter a remark before rejecting this request.');
      this.actionError.set(true);
      return;
    }

    this.isRejecting.set(true);
    this.actionMessage.set('');
    this.actionError.set(false);

    this.pendingRequestService.rejectRequest(requestId, reason).subscribe({
      next: (response: RejectRequestResponse) => {
        this.isRejecting.set(false);

        if (response.status_code !== 200 || !response.data) {
          this.actionMessage.set(
            response.message ??
              response.data?.message ??
              'The request could not be rejected.',
          );
          this.actionError.set(true);
          return;
        }

        this.toast.show(response.data.message);
        void this.router.navigate(['/admin/pending-requests']);
      },
      error: (error: HttpErrorResponse) => {
        this.isRejecting.set(false);
        this.actionMessage.set(this.getRequestActionErrorMessage(error, 'reject'));
        this.actionError.set(true);
      },
    });
  }

  protected approveRequest(requestId: string): void {
    const remark = this.remark.trim();
    if (!remark) {
      this.actionMessage.set('Please enter a remark before approving this request.');
      this.actionError.set(true);
      return;
    }

    this.isApproving.set(true);
    this.actionMessage.set('');
    this.actionError.set(false);

    this.pendingRequestService.approveRequest(requestId, remark).subscribe({
      next: (response: ApproveRequestResponse) => {
        this.isApproving.set(false);

        if (response.status_code !== 200 || !response.data) {
          this.actionMessage.set(
            response.message ??
              response.data?.message ??
              'The request could not be approved.',
          );
          this.actionError.set(true);
          return;
        }

        this.toast.show(response.data.message);
        void this.router.navigate(['/admin/pending-requests']);
      },
      error: (error: HttpErrorResponse) => {
        this.isApproving.set(false);
        this.actionMessage.set(
          this.getRequestActionErrorMessage(error, 'approve'),
        );
        this.actionError.set(true);
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
          ? 'An organization ID and reason are required.'
          : 'An organization ID and note are required.';
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
