import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  OrganizationService as OrganizationApi,
  OrganizationServiceOption,
} from '../../../core/services/organization.service';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-organization-services',
  standalone: true,
  imports: [FormsModule, Sidebar],
  templateUrl: './services.html',
  styleUrls: ['./services.css', '../../../shared/organization-page-layout.css'],
})
export class OrganizationServices implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly organizations = inject(OrganizationApi);

  services: OrganizationServiceOption[] = [];
  loading = true;
  creating = false;
  busyServiceId: number | null = null;
  error = '';
  feedback = '';
  newService = { name: '', priceInr: '' as string | number };

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.services = await this.organizations.services();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not load organization services.';
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  async addService(): Promise<void> {
    this.error = '';
    this.feedback = '';
    const name = this.newService.name.trim();
    const price = String(this.newService.priceInr).trim();
    if (!name || name.length > 120 || !/^\d{1,8}(?:\.\d{1,2})?$/.test(price)) {
      this.error = 'Enter a service name and a valid nonnegative hourly price (up to two decimals).';
      return;
    }

    this.creating = true;
    try {
      const result = await this.organizations.createService({ name, price_inr: price });
      this.services = [
        ...this.services,
        { id: result.id, name, price_inr: Number(price).toFixed(2), is_active: result.is_active },
      ];
      this.newService = { name: '', priceInr: '' };
      this.feedback = 'Service added.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not add the service.';
    } finally {
      this.creating = false;
      this.changeDetector.markForCheck();
    }
  }

  async toggleService(service: OrganizationServiceOption): Promise<void> {
    this.error = '';
    this.feedback = '';
    this.busyServiceId = service.id;
    try {
      await this.organizations.updateServiceStatus(service.id, !service.is_active);
      service.is_active = !service.is_active;
      this.feedback = `${service.name} is now ${service.is_active ? 'active' : 'inactive'}.`;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not update service status.';
    } finally {
      this.busyServiceId = null;
    }
  }
}
