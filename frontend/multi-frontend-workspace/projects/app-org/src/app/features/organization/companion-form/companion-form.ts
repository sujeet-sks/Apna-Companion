import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CreateCompanionInput,
  OrganizationService,
  OrganizationServiceOption,
} from '../../../core/services/organization.service';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-organization-companion-form',
  standalone: true,
  imports: [FormsModule, RouterLink, Sidebar],
  templateUrl: './companion-form.html',
  styleUrls: ['./companion-form.css', '../../../shared/organization-page-layout.css'],
})
export class OrganizationCompanionForm implements OnInit {
  private readonly organizations = inject(OrganizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  isPreview = this.route.snapshot.data['preview'] === true;
  services: OrganizationServiceOption[] = [];
  loading = true;
  submitting = false;
  creatingService = false;
  error = '';
  success = '';
  serviceFeedback = '';
  createdCompanionId = '';
  languageInput = '';
  newService: { name: string; priceInr: string | number | null } = {
    name: '',
    priceInr: '',
  };

  form = {
    name: '',
    email: '',
    mobile: '',
    serviceIds: [] as number[],
    dob: '',
    gender: '',
    address: '',
    identityProofUrl: '',
    photoUrl: '',
    speciality: '',
    experienceYears: '',
  };

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.isPreview = data['preview'] === true;
      void this.loadServices();
    });
  }

  async loadServices(): Promise<void> {
    this.loading = true;
    this.error = '';
    if (this.isPreview) {
      this.services = [
        { id: 1, name: 'Pharmacy visit', price_inr: '450.00', is_active: true },
        { id: 2, name: 'Grocery assistance', price_inr: '600.00', is_active: true },
        { id: 3, name: 'Clinic visit', price_inr: '500.00', is_active: true },
      ];
      this.loading = false;
      return;
    }

    try {
      this.services = (await this.organizations.services()).filter((service) => service.is_active);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not load organization services.';
    } finally {
      this.loading = false;
    }
  }

  toggleService(serviceId: number, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.form.serviceIds = target.checked
      ? [...this.form.serviceIds, serviceId]
      : this.form.serviceIds.filter((id) => id !== serviceId);
  }

  async addService(): Promise<void> {
    this.error = '';
    this.serviceFeedback = '';
    const name = this.newService.name.trim();
    const rawPrice = String(this.newService.priceInr ?? '').trim();
    if (!name || name.length > 120) {
      this.error = 'Enter a service name of at most 120 characters.';
      return;
    }
    if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(rawPrice)) {
      this.error = 'Enter a per-hour price from ₹0 to ₹99,999,999.99 with up to two decimals.';
      return;
    }

    this.creatingService = true;
    try {
      if (this.isPreview) {
        const id = Math.max(0, ...this.services.map((service) => service.id)) + 1;
        this.services = [
          ...this.services,
          { id, name, price_inr: Number(rawPrice).toFixed(2), is_active: true },
        ];
        this.form.serviceIds = [...this.form.serviceIds, id];
      } else {
        const created = await this.organizations.createService({
          name,
          price_inr: rawPrice,
        });
        this.services = [
          ...this.services,
          { id: created.id, name, price_inr: Number(rawPrice).toFixed(2), is_active: created.is_active },
        ];
        this.form.serviceIds = [...this.form.serviceIds, created.id];
      }
      this.newService = { name: '', priceInr: '' };
      this.serviceFeedback = `${name} added and selected for this companion.`;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not add the service.';
    } finally {
      this.creatingService = false;
    }
  }

  async submit(): Promise<void> {
    this.error = '';
    this.success = '';
    if (!this.form.name.trim() || !this.form.email.trim() || !this.form.mobile.trim()) {
      this.error = 'Enter the companion’s name, email, and mobile number.';
      return;
    }
    if (!this.form.serviceIds.length) {
      this.error = 'Select at least one service for this companion.';
      return;
    }
    if (!/^(?:\+91)?[6-9]\d{9}$/.test(this.form.mobile.replace(/[\s()\-]/g, ''))) {
      this.error = 'Enter a valid 10-digit Indian mobile number, optionally prefixed with +91.';
      return;
    }
    if (
      this.form.experienceYears &&
      (!Number.isFinite(Number(this.form.experienceYears)) ||
        Number(this.form.experienceYears) < 0 ||
        Number(this.form.experienceYears) > 999.9)
    ) {
      this.error = 'Experience must be between 0 and 999.9 years.';
      return;
    }

    const input: CreateCompanionInput = {
      name: this.form.name.trim(),
      email: this.form.email.trim(),
      mobile: this.form.mobile.trim(),
      service_ids: this.form.serviceIds,
      languages_known: this.languageInput
        .split(',')
        .map((language) => language.trim())
        .filter(Boolean),
      ...(this.form.dob && { dob: this.form.dob }),
      ...(this.form.gender && { gender: this.form.gender }),
      ...(this.form.address.trim() && { address: this.form.address.trim() }),
      ...(this.form.identityProofUrl.trim() && {
        identity_proof_url: this.form.identityProofUrl.trim(),
      }),
      ...(this.form.photoUrl.trim() && { photo_url: this.form.photoUrl.trim() }),
      ...(this.form.speciality.trim() && { speciality: this.form.speciality.trim() }),
      ...(this.form.experienceYears && {
        experience_years: Number(this.form.experienceYears),
      }),
    };

    this.submitting = true;
    try {
      if (this.isPreview) {
        this.createdCompanionId = 'preview-companion';
        this.success = 'Preview only: companion was not saved or emailed.';
      } else {
        const result = await this.organizations.createCompanion(input);
        this.createdCompanionId = result.companion_id;
        this.success = 'Companion created. A temporary password was sent to their email address.';
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not create the companion.';
    } finally {
      this.submitting = false;
    }
  }
}
