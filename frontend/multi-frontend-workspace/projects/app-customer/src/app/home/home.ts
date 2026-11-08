import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

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
  success: number;
  message: string;
  data: CustomerAddress[];
}

@Component({
  imports: [RouterLink, FormsModule],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly findCompanionApiUrl = '/companions/find';
  private readonly addressesApiUrl = '/addresses';
  private readonly bookingApiUrl = '/bookings/request';

  bookingMode: BookingMode = 'formal';
  selectedOption: string | null = null;
  isFindingCompanion = false;
  companionStatus = '';
  latitude: number | null = null;
  longitude: number | null = null;
  address = '';
  selectedServiceId: number | null = null;
  customerName = '';
  customerMobile = '';
  bookingDate = '';
  bookingTime = '';
  bookingDuration = '';
  readonly minimumBookingDate = this.getTodayDate();
  isSubmitting = false;
  submitStatus = '';

  addresses: CustomerAddress[] = [
    {
      addressId: 101,
      label: 'HOME',
      houseNo: 'B-205',
      buildingStreet: 'Shanti Apartments, MG Road',
      areaLocality: 'Indiranagar',
      landmark: 'Opposite Metro Station',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      country: 'India',
      isDefault: true,
    },
    {
      addressId: 102,
      label: 'WORK',
      houseNo: '4th Floor',
      buildingStreet: 'Tech Park, Outer Ring Road',
      areaLocality: 'Marathahalli',
      landmark: 'Near Flyover',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560037',
      country: 'India',
      isDefault: false,
    },
  ];

  organizations: Organization[] = [
    {
      organizationId: 501,
      name: 'Sahara Care Foundation',
      organizationType: 'NGO',
      logoUrl: '',
      rating: 4.6,
      totalReviews: 238,
      completedBookings: 1450,
      service: [
        {
          serviceId: 1,
          serviceName: 'Parks & outdoor outing',
          serviceDescription: 'Friendly companion for a relaxed park visit',
          servicePrice: 499,
        },
        {
          serviceId: 2,
          serviceName: 'Temple visit',
          serviceDescription: 'Support for travel and time at the temple',
          servicePrice: 599,
        },
      ],
    },
    {
      organizationId: 502,
      name: 'CareNest Companion Services',
      organizationType: 'COMPANION SERVICE',
      logoUrl: '',
      rating: 4.8,
      totalReviews: 312,
      completedBookings: 1890,
      service: [
        {
          serviceId: 3,
          serviceName: 'Hospital visit companion',
          serviceDescription: 'Queue support and help during hospital visits',
          servicePrice: 799,
        },
        {
          serviceId: 4,
          serviceName: 'Bank assistance',
          serviceDescription: 'Support for basic in-person banking tasks',
          servicePrice: 649,
        },
      ],
    },
    {
      organizationId: 503,
      name: 'Helping Hands Network',
      organizationType: 'NGO',
      logoUrl: '',
      rating: 4.5,
      totalReviews: 174,
      completedBookings: 960,
      service: [
        {
          serviceId: 5,
          serviceName: 'Shopping companion',
          serviceDescription: 'Friendly help for groceries and local shopping',
          servicePrice: 449,
        },
      ],
    },
  ];

  readonly formalOptions = ['Hospitals', 'Banks', 'Airport' ];
  readonly everydayOptions = ['Parks', 'Temple Visit', 'Morning walk', 'Shopping'];

  ngOnInit(): void {
    // this.loadAddresses();
  }

  private loadAddresses(): void {
    const userId = this.getStoredUserIdentity();
    if (!userId) return;

    this.http
      .get<CustomerAddressesResponse>(this.addressesApiUrl, {
        params: { userId },
      })
      .subscribe({
        next: (response) => {
          if (response.success === 200 && Array.isArray(response.data)) {
            this.addresses = response.data;
          }
        },
        error: () => {
          this.addresses = this.addresses;
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
    this.customerName = '';
    this.customerMobile = '';
    this.bookingDate = '';
    this.bookingTime = '';
    this.bookingDuration = '';
    this.submitStatus = '';
  }

  isSelectedService(service: CompanionService): boolean {
    return this.selectedServiceId === service.serviceId;
  }

  hasSelectedService(organization: Organization): boolean {
    return organization.service.some((service) => this.isSelectedService(service));
  }

  canSubmitService(): boolean {
    return (
      this.selectedServiceId !== null &&
      this.customerName.trim().length > 0 &&
      /^\d{10}$/.test(this.customerMobile.trim()) &&
      this.bookingDate.length > 0 &&
      this.bookingTime.length > 0 &&
      Number(this.bookingDuration) > 0
    );
  }

  submitService(organization: Organization): void {
    if (!this.canSubmitService() || this.isSubmitting) return;

    this.isSubmitting = true;
    this.submitStatus = '';
    const defaultAddress = this.defaultAddress;
    const address = defaultAddress ? this.getFullAddress(defaultAddress) : '';

    const bookingPayload = {
      userID: this.getStoredUserIdentity(),
      organizationId: organization.organizationId,
      serviceId: this.selectedServiceId,
      contactName: this.customerName.trim(),
      contactPhone: this.customerMobile.trim(),
      latitude: defaultAddress?.latitude ?? '',
      longitude: defaultAddress?.longitude ?? '',
      address,
      durationOfBooking: this.bookingDuration,
      scheduletimestamp: `${this.bookingDate}T${this.bookingTime}:00+05:30`,
    };

    this.http.post<unknown>(this.bookingApiUrl, bookingPayload).subscribe({
      next: () => {
        this.submitStatus = 'Service request submitted successfully.';
      },
      error: () => {
        this.submitStatus = 'Unable to submit the service request. Please try again.';
      },
    }).add(() => {
      this.isSubmitting = false;
    });
  }


  private submitFindCompanionRequest(): void {
    const requestPayload = {
      userID: this.getStoredUserIdentity(),
      purpose: this.bookingMode === 'formal' ? this.selectedOption : 'ngo',
      latitude: this.latitude?.toString() ?? '',
      longitude: this.longitude?.toString() ?? '',
      address: this.getStoredAddress(),
    };

    this.http.post<FindCompanionResponse>(this.findCompanionApiUrl, requestPayload).subscribe({
      next: (response) => {
        if (response.success === 200 && Array.isArray(response.data?.organizations)) {
          this.organizations = response.data.organizations.map((organization) => ({
            ...organization,
            service: Array.isArray(organization.service) ? organization.service : [],
          }));
          this.companionStatus = response.message || 'Organizations fetched successfully.';
        } else {
          this.companionStatus = 'No companion organizations found.';
        }
      },
      error: () => {
        this.companionStatus = 'Unable to find a companion. Please try again.';
      },
    }).add(() => {
      this.isFindingCompanion = false;
    });
  }

  private getStoredUserIdentity(): string {
    if (typeof window === 'undefined') return '';

    return (
      window.localStorage.getItem('userID') ??
      window.localStorage.getItem('userId') ??
      ''
    );
  }

  private getStoredAddress(): string {
    if (typeof window === 'undefined') return '';

    const storedAddress =
      window.localStorage.getItem('defaultAddress') ??
      window.localStorage.getItem('address') ??
      '';
    if (!storedAddress) return '';

    try {
      const address = JSON.parse(storedAddress) as Record<string, unknown>;
      return [
        address['houseNo'],
        address['buildingStreet'],
        address['areaLocality'],
        address['landmark'],
        address['city'],
        address['state'],
        address['pincode'],
        address['country'],
      ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0).join(', ');
    } catch {
      return storedAddress;
    }
  }

  get visibleOptions(): string[] {
    return this.bookingMode === 'formal'
      ? this.formalOptions
      : this.everydayOptions;
  }

  get defaultAddress(): CustomerAddress | null {
    return this.addresses.find((address) => address.isDefault) ?? null;
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
