import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  OrganizationCompanion,
  OrganizationCompanionDetails,
  OrganizationService,
} from '../../../core/services/organization.service';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-organization-companions',
  standalone: true,
  imports: [FormsModule, RouterLink, Sidebar],
  templateUrl: './companions.html',
  styleUrls: [
    './companions.css',
    './companion-details.css',
    '../../../shared/organization-page-layout.css',
  ],
})
export class OrganizationCompanions implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly organizations = inject(OrganizationService);

  companions: OrganizationCompanion[] = [];
  loading = true;
  error = '';
  statusError = '';
  statusMessage = '';
  updatingStatusId: string | null = null;
  expandedCompanionId: string | null = null;
  companionDetails: OrganizationCompanionDetails | null = null;
  detailsLoading = false;
  detailsError = '';
  private detailsRequestId = 0;
  searchInput = '';
  search = '';
  availability = '';
  page = 1;
  readonly pageSize = 10;
  total = 0;

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const result = await this.organizations.companions({
        page: this.page,
        pageSize: this.pageSize,
        search: this.search,
        availability: this.availability,
      });
      this.companions = result.items;
      this.total = result.total;
      if (
        this.expandedCompanionId &&
        !result.items.some((companion) => companion.companion_id === this.expandedCompanionId)
      ) {
        this.closeDetails();
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not load your companions.';
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  toggleDetails(companion: OrganizationCompanion): void {
    if (this.expandedCompanionId === companion.companion_id) {
      this.closeDetails();
      return;
    }

    this.expandedCompanionId = companion.companion_id;
    void this.loadDetails(companion.companion_id);
  }

  async loadDetails(companionId: string): Promise<void> {
    const requestId = ++this.detailsRequestId;
    this.expandedCompanionId = companionId;
    this.companionDetails = null;
    this.detailsError = '';
    this.detailsLoading = true;
    try {
      const details = await this.organizations.companionDetails(companionId);
      if (requestId === this.detailsRequestId) {
        this.companionDetails = details;
      }
    } catch (error) {
      if (requestId === this.detailsRequestId) {
        this.detailsError = error instanceof Error ? error.message : 'Could not load companion details.';
      }
    } finally {
      if (requestId === this.detailsRequestId) {
        this.detailsLoading = false;
        this.changeDetector.markForCheck();
      }
    }
  }

  private closeDetails(): void {
    this.expandedCompanionId = null;
    this.companionDetails = null;
    this.detailsError = '';
    this.detailsLoading = false;
    this.detailsRequestId += 1;
  }

  toggleActive(companion: OrganizationCompanion): void {
    if (this.updatingStatusId !== null) return;
    const isActive = !companion.is_active;
    const action = isActive ? 'Reactivate' : 'Deactivate';
    if (!window.confirm(`${action} ${companion.name}?`)) return;
    void this.updateStatus(
      companion,
      { is_active: isActive },
      `${companion.name} was ${isActive ? 'reactivated' : 'deactivated'}.`,
    );
  }

  toggleAvailability(companion: OrganizationCompanion): void {
    if (!companion.is_active || companion.availability_status === 'busy') return;
    const availability = companion.availability_status === 'available' ? 'unavailable' : 'available';
    void this.updateStatus(
      companion,
      { availability_status: availability },
      `${companion.name} is now ${availability}.`,
    );
  }

  private async updateStatus(
    companion: OrganizationCompanion,
    status: Parameters<OrganizationService['updateCompanionStatus']>[1],
    message: string,
  ): Promise<void> {
    if (this.updatingStatusId !== null) return;

    this.statusError = '';
    this.statusMessage = '';
    this.updatingStatusId = companion.companion_id;
    try {
      await this.organizations.updateCompanionStatus(companion.companion_id, status);
      if (this.companionDetails?.companion_id === companion.companion_id) {
        this.companionDetails = { ...this.companionDetails, ...status };
      }
      this.statusMessage = message;
      await this.load();
      if (!this.error && this.page > this.pageCount) {
        this.page = this.pageCount;
        await this.load();
      }
    } catch (error) {
      this.statusError = error instanceof Error ? error.message : 'Could not update this companion’s status.';
    } finally {
      this.updatingStatusId = null;
      this.changeDetector.markForCheck();
    }
  }

  applyFilters(): void {
    this.search = this.searchInput.trim();
    this.page = 1;
    void this.load();
  }

  changeAvailability(value: string): void {
    this.availability = value;
    this.page = 1;
    void this.load();
  }

  changePage(page: number): void {
    this.page = page;
    void this.load();
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }
}
