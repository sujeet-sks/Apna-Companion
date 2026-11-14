import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrganizationProfile as OrganizationProfileData, OrganizationService } from '../../../core/services/organization.service';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-organization-profile',
  standalone: true,
  imports: [FormsModule, RouterLink, Sidebar],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css', '../../../shared/organization-page-layout.css'],
})
export class OrganizationProfile implements OnInit {
  private readonly organizations = inject(OrganizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  isPreview = this.route.snapshot.data['preview'] === true;
  profile: OrganizationProfileData | null = null;
  loading = true;
  error = '';
  address = '';
  logoUrl = '';
  latitude = '';
  longitude = '';
  saving = false;
  locating = false;
  saveMessage = '';
  saveError = '';

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
      this.profile = {
        organization_id: 'demo-org',
        organization_name: 'Sunrise Community Care',
        organization_type: 'ngo',
        email: 'hello@sunrise.example',
        address: '24 Lake View Road, Powai, Mumbai, Maharashtra',
        logo_url: null,
        latitude: 19.1176,
        longitude: 72.906,
        document_type: 'NGO Registration Certificate',
        approval_status: 'approved',
        approval_remarks: null,
        is_active: true,
      };
      this.address = this.profile.address;
      this.logoUrl = this.profile.logo_url ?? '';
      this.latitude = String(this.profile.latitude);
      this.longitude = String(this.profile.longitude);
      this.loading = false;
      return;
    }

    try {
      this.profile = await this.organizations.profile();
      this.address = this.profile.address;
      this.logoUrl = this.profile.logo_url ?? '';
      this.latitude = this.profile.latitude === null ? '' : String(this.profile.latitude);
      this.longitude = this.profile.longitude === null ? '' : String(this.profile.longitude);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not load the organization profile.';
    } finally {
      this.loading = false;
    }
  }

  async save(): Promise<void> {
    if (!this.profile) {
      return;
    }

    const latitude = Number(this.latitude);
    const longitude = Number(this.longitude);
    if (
      !this.address.trim() ||
      !this.latitude.trim() ||
      !this.longitude.trim() ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      this.saveError = 'Enter a valid address and latitude/longitude.';
      return;
    }

    this.saveError = '';
    this.saveMessage = '';
    this.saving = true;
    try {
      const updates = {
        address: this.address.trim(),
        logo_url: this.logoUrl.trim() || null,
        latitude,
        longitude,
      };
      if (this.isPreview) {
        this.profile = { ...this.profile, ...updates };
      } else {
        await this.organizations.updateProfile(updates);
        this.profile = await this.organizations.profile();
      }
      this.saveMessage = 'Profile updated.';
    } catch (error) {
      this.saveError = error instanceof Error ? error.message : 'Could not update the organization profile.';
    } finally {
      this.saving = false;
    }
  }

  useCurrentLocation(): void {
    this.saveError = '';
    this.saveMessage = '';
    if (!navigator.geolocation) {
      this.saveError = 'This browser does not support location access.';
      return;
    }

    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = position.coords.latitude.toFixed(6);
        this.longitude = position.coords.longitude.toFixed(6);
        this.locating = false;
      },
      (error) => {
        this.saveError = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow location access in your browser and try again.'
          : error.code === error.TIMEOUT
            ? 'Could not get your location in time. Please try again.'
            : 'Could not determine your location. Check your device location settings and try again.';
        this.locating = false;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
}
