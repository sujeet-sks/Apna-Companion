import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Address {
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
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
}

interface AddressApiResponse {
  success: number;
  message: string;
  data: Address[];
}

interface AddressActionResponse {
  success: number;
  message?: string;
  data?: {
    message?: string;
  };
}

interface ReverseGeocodeResponse {
  success: number;
  data?: Partial<
    Pick<
      Address,
      | 'houseNo'
      | 'buildingStreet'
      | 'areaLocality'
      | 'landmark'
      | 'city'
      | 'state'
      | 'pincode'
      | 'country'
    >
  >;
}

@Component({
  selector: 'app-manage-address',
  imports: [FormsModule],
  styleUrl: './manage-address.css',
  templateUrl: './manage-address.html',
})
export class ManageAddress implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly addressesApiUrl = '/api/v1/customer/getAllSavedAddress/';
  private readonly deleteAddressApiUrl = '/api/v1/customer/deleteAddress/';
  private readonly editAddressApiUrl = '/api/v1/customer/editExistingAddress/';
  private readonly saveAddressApiUrl = '/api/v1/customer/saveNewAddress/';
  private readonly reverseGeocodeUrl = '/addresses/reverse-geocode';
  readonly userId: number | null = this.getStoredUserId();
  readonly addresses = signal<Address[]>([]);
  readonly addressStatus = signal('');

  formOpen = false;
  editingId: number | null = null;
  label = 'HOME';
  houseNo = '';
  buildingStreet = '';
  areaLocality = '';
  landmark = '';
  city = '';
  state = '';
  pincode = '';
  country = 'India';
  locationStatus = '';
  latitude: number | null = null;
  longitude: number | null = null;

  private getStoredUserId(): number | null {
    if (typeof window === 'undefined') return null;

    const storedUserId =
      window.sessionStorage.getItem('userID') ??
      window.sessionStorage.getItem('userId') ??
      window.sessionStorage.getItem('customer_id');
    if (!storedUserId) return null;

    const userId = Number(storedUserId);
    return Number.isFinite(userId) ? userId : 1234;
  }

  ngOnInit(): void {
    this.loadAddresses();
  }

  loadAddresses(): void {
    if (this.userId === null) {
      this.addresses.set([]);
      this.addressStatus.set('Please log in to view your saved addresses.');
      return;
    }

    this.http.post<AddressApiResponse>(this.addressesApiUrl, {
      userId: this.userId,
    }).subscribe({
      next: (response) => {
        if (response.success === 200 && Array.isArray(response.data)) {
          this.addresses.set(response.data);
          return;
        }
        this.addresses.set([]);
        this.addressStatus.set(response.message || 'Unable to load saved addresses.');
      },
      error: (error: HttpErrorResponse) => {
        this.addresses.set([]);
        this.addressStatus.set(
          error.error?.message ?? 'Unable to load saved addresses. Please try again.',
        );
      },
    });
  }

  getFullAddress(address: Address): string {
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

  getLabelTitle(label: string): string {
    if (label.toUpperCase() === 'HOME') return 'Home';
    if (label.toUpperCase() === 'WORK') return 'Office';
    if (label.toUpperCase() === 'PARENTS') return "Parents' home";
    return label;
  }

  openAddForm(): void {
    this.editingId = null;
    this.label = 'HOME';
    this.resetAddressFields();
    this.latitude = null;
    this.longitude = null;
    this.locationStatus = '';
    this.formOpen = true;
  }

  openEditForm(address: Address): void {
    this.editingId = address.addressId;
    this.locationStatus = '';
    this.latitude = address.latitude ?? 19.1326204;
    this.longitude = address.longitude ?? 72.9109825;
    this.label = address.label;
    this.houseNo = address.houseNo;
    this.buildingStreet = address.buildingStreet;
    this.areaLocality = address.areaLocality;
    this.landmark = address.landmark;
    this.city = address.city;
    this.state = address.state;
    this.pincode = address.pincode;
    this.country = address.country;
    this.formOpen = true;
  }

  resetAddressFields(): void {
    this.houseNo = '';
    this.buildingStreet = '';
    this.areaLocality = '';
    this.landmark = '';
    this.city = '';
    this.state = '';
    this.pincode = '';
    this.country = 'India';
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.locationStatus = 'Current location is not supported by this device.';
      return;
    }

    this.locationStatus = 'Fetching your location...';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.locationStatus =
          `Current location fetched successfully. Latitude: ${this.latitude.toFixed(6)}, Longitude: ${this.longitude.toFixed(6)}`;
        this.prefillAddressFromCoordinates();
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          this.locationStatus = 'Location permission was denied.';
        } else {
          this.locationStatus = 'Unable to fetch your current location.';
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  prefillAddressFromCoordinates(): void {
    if (this.latitude === null || this.longitude === null) return;

    this.locationStatus = 'Fetching address details...';
    this.http
      .get<ReverseGeocodeResponse>(this.reverseGeocodeUrl, {
        params: {
          lat: this.latitude.toString(),
          lon: this.longitude.toString(),
        },
      })
      .subscribe({
        next: (result) => {
          const address = result.data;
          if (result.success !== 200 || !address) {
            this.locationStatus = 'Location fetched, but address details were unavailable.';
            return;
          }

          this.houseNo = address.houseNo ?? '';
          this.buildingStreet = address.buildingStreet ?? '';
          this.areaLocality = address.areaLocality ?? '';
          this.landmark = address.landmark ?? '';
          this.city = address.city ?? '';
          this.state = address.state ?? '';
          this.pincode = address.pincode ?? '';
          this.country = address.country ?? '';

          this.locationStatus =
            `Current location fetched successfully. Latitude: ${this.latitude!.toFixed(6)}, Longitude: ${this.longitude!.toFixed(6)}`
            + ' Address fields have been prefilled.';
        },
        error: () => {
          this.locationStatus =
            `Current location fetched successfully. Latitude: ${this.latitude!.toFixed(6)}, Longitude: ${this.longitude!.toFixed(6)}`
            + ' Unable to prefill address details.';
        },
      });
  }

  canSaveAddress(): boolean {
    const requiredFieldsPresent = [
      this.label,
      this.houseNo,
      this.buildingStreet,
      this.areaLocality,
      this.city,
      this.state,
      this.pincode,
      this.country,
    ].every((value) => value.trim().length > 0);

    return requiredFieldsPresent
      && /^\d{6}$/.test(this.pincode.trim());
  }

  closeForm(): void {
    this.formOpen = false;
  }

  saveAddress(): void {
    if (!this.canSaveAddress()) return;
    if (this.userId === null) {
      this.addressStatus.set('Please log in to save an address.');
      return;
    }

    const existingAddress =
      this.editingId !== null
        ? this.addresses().find((item) => item.addressId === this.editingId)
        : undefined;
    const isDefault = existingAddress?.isDefault ?? this.addresses().length === 0;

    this.addressStatus.set('');
    const addressPayload = {
      userId: this.userId,
      ...(this.editingId !== null ? { addressId: this.editingId } : {}),
      label: this.label,
      houseNo: this.houseNo.trim(),
      buildingStreet: this.buildingStreet.trim(),
      areaLocality: this.areaLocality.trim(),
      landmark: this.landmark.trim(),
      city: this.city.trim(),
      state: this.state.trim(),
      pincode: this.pincode.trim(),
      country: this.country.trim(),
      latitude: this.latitude,
      longitude: this.longitude,
      isDefault,
    };

    if (this.editingId !== null) {
      this.http
        .post<AddressActionResponse>(this.editAddressApiUrl, addressPayload)
        .subscribe({
          next: (response) => {
            if (response.success !== 200) {
              this.addressStatus.set(
                response.data?.message ??
                  response.message ??
                  'Unable to update the address. Please try again.',
              );
              return;
            }

            this.addressStatus.set(
              response.data?.message ?? response.message ?? 'Address updated successfully.',
            );
            this.closeForm();
            this.loadAddresses();
          },
          error: (error: HttpErrorResponse) => {
            this.addressStatus.set(
              error.error?.message ??
                'Unable to update the address. Please try again.',
            );
          },
        });
    } else {
      this.http
        .post<AddressActionResponse>(this.saveAddressApiUrl, addressPayload)
        .subscribe({
          next: (response) => {
            if (response.success !== 200) {
              this.addressStatus.set(
                response.data?.message ??
                  response.message ??
                  'Unable to save the address. Please try again.',
              );
              return;
            }

            this.addressStatus.set(
              response.data?.message ?? response.message ?? 'Address added successfully.',
            );
            this.closeForm();
            this.loadAddresses();
          },
          error: (error: HttpErrorResponse) => {
            this.addressStatus.set(
              error.error?.message ?? 'Unable to save the address. Please try again.',
            );
          },
        });
    }
  }

  deleteAddress(id: number): void {
    if (this.userId === null) {
      this.addressStatus.set('Please log in to delete an address.');
      return;
    }

    const deletePayload = {
      userId: this.userId,
      addressId: id,
    };

    this.addressStatus.set('');
    this.http
      .post<AddressActionResponse>(this.deleteAddressApiUrl, deletePayload)
      .subscribe({
        next: (response) => {
          if (response.success !== 200) {
            this.addressStatus.set(
              response.message ?? 'Unable to delete the address. Please try again.',
            );
            return;
          }

          this.addressStatus.set(
            response.message ?? 'Address deleted successfully.',
          );
          this.loadAddresses();
        },
        error: (error: HttpErrorResponse) => {
          this.addressStatus.set(
            error.error?.message ?? 'Unable to delete the address. Please try again.',
          );
        },
      });
  }

  setDefault(id: number): void {
    if (this.userId === null) {
      this.addressStatus.set('Please log in to update an address.');
      return;
    }

    const address = this.addresses().find((item) => item.addressId === id);
    if (!address) return;

    const addressPayload = {
      userId: this.userId,
      addressId: address.addressId,
      label: address.label,
      houseNo: address.houseNo,
      buildingStreet: address.buildingStreet,
      areaLocality: address.areaLocality,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
      latitude: address.latitude ?? 19.1326204,
      longitude: address.longitude ?? 72.9109825,
      isDefault: true,
    };

    this.addressStatus.set('');
    this.http
      .post<AddressActionResponse>(this.editAddressApiUrl, addressPayload)
      .subscribe({
        next: (response) => {
          if (response.success !== 200) {
            this.addressStatus.set(
              response.data?.message ??
                response.message ??
                'Unable to set this address as default. Please try again.',
            );
            return;
          }

          this.addressStatus.set(
            response.data?.message ?? response.message ?? 'Default address updated.',
          );
          this.loadAddresses();
        },
        error: (error: HttpErrorResponse) => {
          this.addressStatus.set(
            error.error?.message ??
              'Unable to set this address as default. Please try again.',
          );
        },
      });
  }
}
