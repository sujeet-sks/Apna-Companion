import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly organizations = inject(OrganizationService);
  profile: OrganizationProfileData | null = null;
  loading = true;
  error = '';
  organizationRatingAverage: string | null = null;
  organizationRatingCount = 0;
  ratingLoading = false;
  ratingError = '';
  address = '';
  logoUrl = '';
  readingLogo = false;
  latitude = '';
  longitude = '';
  saving = false;
  locating = false;
  saveMessage = '';
  saveError = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.profile = null;
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
      this.changeDetector.markForCheck();
    }
    if (this.profile) {
      void this.loadRatings();
    }
  }

  async loadRatings(): Promise<void> {
    this.ratingLoading = true;
    this.ratingError = '';
    try {
      const bookings = await this.organizations.allBookings();
      const ratings = bookings.reduce<number[]>((values, booking) => {
        if (booking.status === 'completed' && typeof booking.organization_rating === 'number') {
          values.push(booking.organization_rating);
        }
        return values;
      }, []);
      this.organizationRatingCount = ratings.length;
      this.organizationRatingAverage = ratings.length
        ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
        : null;
    } catch (error) {
      this.ratingError = error instanceof Error ? error.message : 'Could not load organization ratings.';
    } finally {
      this.ratingLoading = false;
      this.changeDetector.markForCheck();
    }
  }

  selectLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.saveError = '';
    this.saveMessage = '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 1_000_000) {
      this.saveError = 'Choose a PNG, JPEG, or WebP image up to 1 MB.';
      return;
    }

    this.readingLogo = true;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        this.logoUrl = reader.result;
      } else {
        this.saveError = 'Could not read the logo image. Choose the file again.';
      }
      this.readingLogo = false;
      this.changeDetector.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  async save(): Promise<void> {
    if (!this.profile || this.readingLogo || this.saving) {
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
      await this.organizations.updateProfile(updates);
      this.profile = await this.organizations.profile();
      this.saveMessage = 'Profile updated.';
    } catch (error) {
      this.saveError = error instanceof Error ? error.message : 'Could not update the organization profile.';
    } finally {
      this.saving = false;
      this.changeDetector.markForCheck();
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
        this.changeDetector.markForCheck();
      },
      (error) => {
        this.saveError = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow location access in your browser and try again.'
          : error.code === error.TIMEOUT
            ? 'Could not get your location in time. Please try again.'
            : 'Could not determine your location. Check your device location settings and try again.';
        this.locating = false;
        this.changeDetector.markForCheck();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
}
