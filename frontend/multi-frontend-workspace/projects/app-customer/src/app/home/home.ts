import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

type BookingMode = 'formal' | 'everyday';

interface CompanionService {
  serviceId: number;
  serviceName: string;
  serviceDescription: string;
  servicePrice: number;
}

interface Organization {
  organizationId: number;
  name: string;
  organizationType: string;
  logoUrl: string;
  rating: number;
  totalReviews: number;
  completedBookings: number;
  service: CompanionService[];
}

interface FindCompanionResponse {
  success: number;
  message: string;
  data: {
    organizations: Organization[];
  };
}

interface CustomerAddress {
  addressId: number;
  label: string;
  houseNo: string;
  buildingStreet: string;
  areaLocality: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  isDefault: boolean;
}

interface CustomerAddressesResponse {
  success?: number;
  message?: string;
  data?: CustomerAddress[] | CustomerAddress;
}

type CustomerAddressesApiResponse =
  | CustomerAddressesResponse
  | CustomerAddress[]
  | CustomerAddress;

@Component({
  imports: [FormsModule],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly findCompanionApiUrl = '/api/v1/customer/getOrganizationDetails/';
  private readonly addressesApiUrl = '/api/v1/customer/getAllSavedAddress/';
  private readonly bookingApiUrl = '/api/v1/customer/requestBooking/';

  bookingMode: BookingMode = 'formal';
  selectedOption: string | null = null;
  readonly isFindingCompanion = signal(false);
  readonly companionStatus = signal('');
  selectedServiceId: number | null = null;
  customerName = '';
  customerMobile = '';
  bookingDate = '';
  bookingTime = '';
  bookingDurationHours: number | null = null;
  bookingDurationMinutes: number | null = null;
  readonly minimumBookingDate = this.getTodayDate();
  readonly isSubmitting = signal(false);
  readonly submitStatus = signal('');
  readonly addresses = signal<CustomerAddress[]>([]);
  readonly addressStatus = signal('');
  readonly isLoadingAddresses = signal(false);

  readonly organizations = signal<Organization[]>([]);

  readonly formalOptions = ['hospital', 'bank', 'rto','Airport' ];
  readonly everydayOptions = ['Parks', 'Temple Visit', 'Morning walk', 'Shopping'];

  ngOnInit(): void {
    this.loadAddresses();
  }

  private loadAddresses(): void {
    const userId = Number(this.getStoredUserIdentity());
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      this.addresses.set([]);
      this.addressStatus.set('Please log in to view your saved addresses.');
      return;
    }

    this.addressStatus.set('');
    this.isLoadingAddresses.set(true);
    this.http
      .post<CustomerAddressesApiResponse>(this.addressesApiUrl, { userId })
      .pipe(finalize(() => this.isLoadingAddresses.set(false)))
      .subscribe({
        next: (response) => {
          if (Array.isArray(response)) {
            this.addresses.set(response);
            this.addressStatus.set(response.length ? '' : 'No saved addresses found.');
            return;
          }

          if ('addressId' in response) {
            this.addresses.set([response]);
            this.addressStatus.set('');
            return;
          }

          if (response.success !== undefined && response.success !== 200) {
            this.addresses.set([]);
            this.addressStatus.set(response.message || 'Unable to load saved addresses.');
            return;
          }

          const addresses = Array.isArray(response.data)
            ? response.data
            : response.data
              ? [response.data]
              : [];
          this.addresses.set(addresses);
          this.addressStatus.set(
            addresses.length
              ? ''
              : response.message || 'No saved addresses found.',
          );
        },
        error: (error: HttpErrorResponse) => {
          this.addresses.set([]);
          this.addressStatus.set(
            error.error?.message ?? 'Unable to load saved addresses. Please try again.',
          );
        },
      });
  }

  selectBookingMode(mode: BookingMode): void {
    this.bookingMode = mode;
    this.selectedOption = null;
  }

  private getTodayDate(): string {
    const today = new Date();
    const localDate = new Date(
      today.getTime() - today.getTimezoneOffset() * 60_000,
    );
    return localDate.toISOString().slice(0, 10);
  }

  selectOption(option: string): void {
    this.selectedOption = option;
  }

  selectService(service: CompanionService): void {
    this.selectedServiceId = service.serviceId;
    this.bookingDate = '';
    this.bookingTime = '';
    this.bookingDurationHours = null;
    this.bookingDurationMinutes = null;
    this.submitStatus.set('');
  }

  isSelectedService(service: CompanionService): boolean {
    return this.selectedServiceId === service.serviceId;
  }

  hasSelectedService(organization: Organization): boolean {
    return organization.service.some((service) => this.isSelectedService(service));
  }

  canSubmitService(): boolean {
    const durationInMinutes = this.durationInMinutes;
    return (
      this.selectedServiceId !== null &&
      this.customerName.trim().length > 0 &&
      /^\d{10}$/.test(this.customerMobile.trim()) &&
      this.bookingDate.length > 0 &&
      this.bookingTime.length > 0 &&
      durationInMinutes !== null &&
      durationInMinutes > 0
    );
  }

  submitService(organization: Organization): void {
    if (!this.canSubmitService() || this.isSubmitting()) return;
    const durationInMinutes = this.durationInMinutes;
    if (durationInMinutes === null) return;

    this.isSubmitting.set(true);
    this.submitStatus.set('');
    const defaultAddress = this.defaultAddress;
    const address = defaultAddress ? this.getFullAddress(defaultAddress) : '';

    const bookingPayload = {
      userID: this.getStoredUserIdentity(),
      organizationId: organization.organizationId,
      serviceId: this.selectedServiceId,
      contactName: this.customerName.trim(),
      contactPhone: `+91${this.customerMobile.trim()}`,
      latitude: defaultAddress?.latitude ?? '',
      longitude: defaultAddress?.longitude ?? '',
      address,
      durationOfBooking: durationInMinutes,
      scheduletimestamp: `${this.bookingDate}T${this.bookingTime}:00+05:30`,
    };

    this.http.post<unknown>(this.bookingApiUrl, bookingPayload).subscribe({
      next: () => {
        this.submitStatus.set('Service request submitted successfully.');
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      },
      error: () => {
        this.submitStatus.set(
          'Unable to submit the service request. Please try again.',
        );
      },
    }).add(() => {
      this.isSubmitting.set(false);
    });
  }


  protected submitFindCompanionRequest(): void {
    if (this.selectedOption === null || this.isFindingCompanion()) return;

    const defaultAddress = this.defaultAddress;
    if (!defaultAddress) {
      this.companionStatus.set('Set a default address before finding a companion.');
      return;
    }

    const latitude = Number(defaultAddress.latitude);
    const longitude = Number(defaultAddress.longitude);
    if (
      defaultAddress.latitude == null ||
      String(defaultAddress.latitude).trim() === '' ||
      defaultAddress.longitude == null ||
      String(defaultAddress.longitude).trim() === '' ||
      !Number.isFinite(latitude) ||
      Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) ||
      Math.abs(longitude) > 180
    ) {
      this.companionStatus.set(
        '',
      );
      return;
    }

    this.organizations.set([]);
    this.companionStatus.set('');
    this.isFindingCompanion.set(true);
    const requestPayload = {
      userID: this.getStoredUserIdentity(),
      purpose: this.bookingMode === 'formal' ? this.selectedOption : 'ngo',
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      address: this.getFullAddress(defaultAddress),
    };

    this.http.post<FindCompanionResponse>(this.findCompanionApiUrl, requestPayload).subscribe({
      next: (response) => {
        if (response.success === 200 && Array.isArray(response.data?.organizations)) {
          const organizations = response.data.organizations.map((organization) => ({
            ...organization,
            service: Array.isArray(organization.service) ? organization.service : [],
          }));
          this.organizations.set(organizations);
          this.companionStatus.set(
            organizations.length
              ? response.message || 'Organizations fetched successfully.'
              : response.message || 'No companion organizations found.',
          );
        } else {
          this.companionStatus.set('No companion organizations found.');
        }
      },
      error: () => {
        this.companionStatus.set('Unable to find a companion. Please try again.');
      },
    }).add(() => {
      this.isFindingCompanion.set(false);
    });
  }

  private getStoredUserIdentity(): string {
    if (typeof window === 'undefined') return '';

    return (
      window.sessionStorage.getItem('customer_id') ??
      window.sessionStorage.getItem('userID') ??
      window.sessionStorage.getItem('userId') ??
      ''
    );
  }

  get visibleOptions(): string[] {
    return this.bookingMode === 'formal'
      ? this.formalOptions
      : this.everydayOptions;
  }

  private get durationInMinutes(): number | null {
    const hours = this.bookingDurationHours ?? 0;
    const minutes = this.bookingDurationMinutes ?? 0;
    if (
      !Number.isSafeInteger(hours) ||
      hours < 0 ||
      !Number.isSafeInteger(minutes) ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    const duration = hours * 60 + minutes;
    return Number.isSafeInteger(duration) ? duration : null;
  }

  get defaultAddress(): CustomerAddress | null {
    return this.addresses().find((address) => address.isDefault) ?? null;
  }

  getFullAddress(address: CustomerAddress): string {
    return [
      address.houseNo,
      address.buildingStreet,
      address.areaLocality,
      address.landmark,
      address.city,
      address.state,
      address.pincode,
      address.country,
    ].filter(Boolean).join(', ');
  }
}
