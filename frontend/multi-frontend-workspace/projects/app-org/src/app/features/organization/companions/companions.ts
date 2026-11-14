import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  OrganizationCompanion,
  OrganizationService,
} from '../../../core/services/organization.service';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-organization-companions',
  standalone: true,
  imports: [FormsModule, RouterLink, Sidebar],
  templateUrl: './companions.html',
  styleUrls: ['./companions.css', '../../../shared/organization-page-layout.css'],
})
export class OrganizationCompanions implements OnInit {
  private readonly organizations = inject(OrganizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  isPreview = this.route.snapshot.data['preview'] === true;
  companions: OrganizationCompanion[] = [];
  loading = true;
  error = '';
  searchInput = '';
  search = '';
  availability = '';
  page = 1;
  readonly pageSize = 10;
  total = 0;

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.isPreview = data['preview'] === true;
      void this.load();
    });
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    if (this.isPreview) {
      const sample: OrganizationCompanion[] = [
        { companion_id: 'EMP001', name: 'Priya Sharma', is_active: true, availability_status: 'available' },
        { companion_id: 'EMP002', name: 'Sunita Kapoor', is_active: true, availability_status: 'busy' },
        { companion_id: 'EMP003', name: 'Anil Mehta', is_active: true, availability_status: 'available' },
      ];
      const query = this.search.toLowerCase();
      this.companions = sample.filter((companion) =>
        (!query || `${companion.name} ${companion.companion_id}`.toLowerCase().includes(query)) &&
        (!this.availability || companion.availability_status === this.availability),
      );
      this.total = this.companions.length;
      this.loading = false;
      return;
    }

    try {
      const result = await this.organizations.companions({
        page: this.page,
        pageSize: this.pageSize,
        search: this.search,
        availability: this.availability,
      });
      this.companions = result.items;
      this.total = result.total;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not load your companions.';
    } finally {
      this.loading = false;
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
