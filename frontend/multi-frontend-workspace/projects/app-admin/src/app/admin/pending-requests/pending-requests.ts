import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PendingRequest } from './pending-request.model';
import { PendingRequestService } from './pending-request.service';

@Component({
  imports: [RouterLink],
  selector: 'app-pending-requests',
  styleUrl: './pending-requests.css',
  templateUrl: './pending-requests.html',
})
export class PendingRequests implements OnInit {
  private readonly pendingRequestService = inject(PendingRequestService);

  protected readonly pendingRequests = signal<PendingRequest[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly currentPage = signal(1);
  protected readonly pageSize = 10;
  protected readonly totalPages = computed(() =>
    Math.ceil(this.pendingRequests().length / this.pageSize),
  );
  protected readonly paginatedRequests = computed(() => {
    const firstItem = (this.currentPage() - 1) * this.pageSize;
    return this.pendingRequests().slice(firstItem, firstItem + this.pageSize);
  });

  ngOnInit(): void {
    const adminId = this.readAdminId();
    if (!adminId) {
      this.errorMessage.set('Unable to get data.');
      this.isLoading.set(false);
      return;
    }

    this.pendingRequestService
      .getPendingRequests(adminId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (requests) => {
          this.currentPage.set(1);
          this.pendingRequests.set(requests);
        },
        error: () => this.errorMessage.set('Unable to get data.'),
      });
  }

  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  private readAdminId(): string | null {
    const storedAdmin = sessionStorage.getItem('admin_user');

    try {
      const adminUser: unknown = storedAdmin ? JSON.parse(storedAdmin) : null;
      if (
        typeof adminUser === 'object' &&
        adminUser !== null &&
        'admin_id' in adminUser &&
        typeof adminUser.admin_id === 'string'
      ) {
        return adminUser.admin_id;
      }
    } catch {
      return null;
    }

    return null;
  }
}
