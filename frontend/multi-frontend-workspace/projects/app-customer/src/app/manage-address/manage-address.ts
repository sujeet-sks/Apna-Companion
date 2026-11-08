import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
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
  contactName: string;
  contactPhone: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
}

interface AddressApiResponse {
  success: number;
  message: string;
  data: Address[];
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
  private readonly addressesApiUrl = '/addresses';
  private readonly reverseGeocodeUrl = '/addresses/reverse-geocode';
  readonly userId: number | null = this.getStoredUserId();

  readonly staticAddressResponse: AddressApiResponse = {
    success: 200,
    message: 'Addresses fetched successfully',
    data: [
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
        contactName: 'Ramesh Kumar',
        contactPhone: '9876543210',
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
        contactName: 'Ramesh Kumar',
        contactPhone: '9876543210',
        isDefault: false,
      },
    ],
  };

  addresses: Address[] = this.staticAddressResponse.data;

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
  contactName = '';
  contactPhone = '';
  locationStatus = '';
  latitude: number | null = null;
  longitude: number | null = null;

  private getStoredUserId(): number | null {
    if (typeof window === 'undefined') return null;

    const storedUserId = window.localStorage.getItem('userId');
    if (!storedUserId) return null;

    const userId = Number(storedUserId);
    return Number.isFinite(userId) ? userId : null;
  }

  ngOnInit(): void {
    this.loadAddresses();
  }

  loadAddresses(): void {
    this.http.get<AddressApiResponse>(this.addressesApiUrl).subscribe({
      next: (response) => {
        if (response.success === 200 && Array.isArray(response.data)) {
          this.addresses = response.data;
        }
      },
      error: () => {
        this.addresses = this.staticAddressResponse.data;
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
    this.latitude = address.latitude ?? null;
    this.longitude = address.longitude ?? null;
    this.label = address.label;
    this.houseNo = address.houseNo;
    this.buildingStreet = address.buildingStreet;
    this.areaLocality = address.areaLocality;
    this.landmark = address.landmark;
    this.city = address.city;
    this.state = address.state;
    this.pincode = address.pincode;
    this.country = address.country;
    this.contactName = address.contactName;
    this.contactPhone = address.contactPhone;
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
    this.contactName = '';
    this.contactPhone = '';
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
      this.contactName,
      this.contactPhone,
    ].every((value) => value.trim().length > 0);

    return requiredFieldsPresent
      && /^\d{6}$/.test(this.pincode.trim())
      && /^\d{10}$/.test(this.contactPhone.trim());
  }

  closeForm(): void {
    this.formOpen = false;
  }

  saveAddress(): void {
    if (!this.canSaveAddress()) return;

    const existingAddress =
      this.editingId !== null
        ? this.addresses.find((item) => item.addressId === this.editingId)
        : undefined;
    const isDefault = existingAddress?.isDefault ?? this.addresses.length === 0;

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
      contactName: this.contactName.trim(),
      contactPhone: this.contactPhone.trim(),
      latitude: this.latitude,
      longitude: this.longitude,
      isDefault,
    };

    if (this.editingId !== null) {
      this.http
        .put<Address>(this.addressesApiUrl, addressPayload)
        .subscribe({
          next: () => {
            this.loadAddresses();
            this.closeForm();
          },
          error: () => {
            this.locationStatus = 'Unable to update the address. Please try again.';
          },
        });
    } else {
      this.http
        .post<Address>(this.addressesApiUrl, addressPayload)
        .subscribe({
          next: () => {
            this.loadAddresses();
            this.closeForm();
          },
          error: () => {
            this.locationStatus = 'Unable to save the address. Please try again.';
          },
        });
    }
  }

  deleteAddress(id: number): void {
    const deletePayload = {
      userId: this.userId,
      addressId: id,
    };

    this.http
      .delete(this.addressesApiUrl, { body: deletePayload })
      .subscribe({
        next: () => {
          this.loadAddresses();
        },
        error: () => {
          this.locationStatus = 'Unable to delete the address. Please try again.';
        },
      });
  }

  setDefault(id: number): void {
    const address = this.addresses.find((item) => item.addressId === id);
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
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
      isDefault: true,
    };

    this.http
      .put<Address>(this.addressesApiUrl, addressPayload)
      .subscribe({
        next: () => {
          this.loadAddresses();
        },
        error: () => {
          this.locationStatus = 'Unable to set this address as default. Please try again.';
        },
      });
  }
}
