import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, catchError, finalize, map, of, switchMap, timeout } from 'rxjs';
import { GeocodingAddress, GeocodingService, LatLng } from '../shared/geocoding.service';

interface AddressFields {
  houseNo: string;
  buildingStreet: string;
  areaLocality: string;
  label: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface AddressMutationPayload extends AddressFields {
  userId: number;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

interface AddressCoordinatesResult {
  coordinates: LatLng;
  usedFallback: boolean;
}

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

@Component({
  selector: 'app-manage-address',
  imports: [FormsModule],
  styleUrl: './manage-address.css',
  templateUrl: './manage-address.html',
})
export class ManageAddress implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly geocoding = inject(GeocodingService);
  private readonly fallbackLatitude = 19.1326204;
  private readonly fallbackLongitude = 72.9109825;
  private readonly addressesApiUrl = '/api/v1/customer/getAllSavedAddress/';
  private readonly deleteAddressApiUrl = '/api/v1/customer/deleteAddress/';
  private readonly editAddressApiUrl = '/api/v1/customer/editExistingAddress/';
  private readonly saveAddressApiUrl = '/api/v1/customer/saveNewAddress/';
  readonly userId: number | null = this.getStoredUserId();
  readonly addresses = signal<Address[]>([]);
  readonly addressStatus = signal('');
  readonly isLoadingAddresses = signal(false);
  readonly isSavingAddress = signal(false);

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

  private getStoredUserId(): number | null {
    if (typeof window === 'undefined') return null;

    const storedUserId =
      window.sessionStorage.getItem('customer_id') ??
      window.sessionStorage.getItem('userID') ??
      window.sessionStorage.getItem('userId');
    if (!storedUserId) return null;

    const userId = Number(storedUserId);
    return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
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

    this.addressStatus.set('');
    this.isLoadingAddresses.set(true);
    this.http.post<AddressApiResponse>(this.addressesApiUrl, {
      userId: this.userId,
    }).pipe(finalize(() => this.isLoadingAddresses.set(false))).subscribe({
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
    this.formOpen = true;
  }

  openEditForm(address: Address): void {
    this.editingId = address.addressId;
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

  // 1. Get latitude/longitude from the address. On any failure, use the static defaults.
  private getAddressCoordinates(
    address: GeocodingAddress,
  ): Observable<AddressCoordinatesResult> {
    const fallback: AddressCoordinatesResult = {
      coordinates: { lat: this.fallbackLatitude, lng: this.fallbackLongitude },
      usedFallback: true,
    };

    return this.geocoding
      .geocode(address)
      .pipe(
        timeout(8000),
        map((coordinates): AddressCoordinatesResult =>
          coordinates ? { coordinates, usedFallback: false } : fallback,
        ),
        catchError(() => of(fallback)),
      );
  }

  // 2. Call the backend: save a new address, or edit an existing one when editingId is set.
  private submitAddress(
    payload: AddressMutationPayload,
    editingId: number | null,
  ): Observable<AddressActionResponse> {
    if (editingId === null) {
      return this.http.post<AddressActionResponse>(this.saveAddressApiUrl, payload);
    }
    return this.http.post<AddressActionResponse>(this.editAddressApiUrl, {
      ...payload,
      addressId: editingId,
    });
  }

  // Save button: get coordinates first, then send them to the backend.
  saveAddress(): void {
    if (!this.canSaveAddress() || this.isSavingAddress()) return;
    const userId = this.userId;
    if (userId === null) {
      this.addressStatus.set('Please log in to save an address.');
      return;
    }

    const editingId = this.editingId;
    const isEdit = editingId !== null;
    const existing = isEdit
      ? this.addresses().find((address) => address.addressId === editingId)
      : undefined;
    const isDefault = existing?.isDefault ?? this.addresses().length === 0;

    const fields: AddressFields = {
      label: this.label.trim(),
      houseNo: this.houseNo.trim(),
      buildingStreet: this.buildingStreet.trim(),
      areaLocality: this.areaLocality.trim(),
      landmark: this.landmark.trim(),
      city: this.city.trim(),
      state: this.state.trim(),
      pincode: this.pincode.trim(),
      country: this.country.trim(),
    };

    this.isSavingAddress.set(true);
    this.addressStatus.set('Finding the address location...');

    this.getAddressCoordinates({
      city: fields.city,
      state: fields.state,
      pincode: fields.pincode,
      country: fields.country,
    })
      .pipe(
        switchMap(({ coordinates, usedFallback }) => {
          const payload: AddressMutationPayload = {
            userId,
            ...fields,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            isDefault,
          };
          return this.submitAddress(payload, editingId).pipe(
            map((response) => ({ response, usedFallback })),
          );
        }),
        finalize(() => this.isSavingAddress.set(false)),
      )
      .subscribe({
        next: ({ response, usedFallback }) => {
          const msg = response.data?.message ?? response.message;
          if (response.success !== 200) {
            this.addressStatus.set(msg ?? 'Unable to save the address. Please try again.');
            return;
          }

          this.closeForm();
          this.loadAddresses();
          const success =
            msg ?? (isEdit ? 'Address updated successfully.' : 'Address added successfully.');
          this.addressStatus.set(
            usedFallback
              ? `${success} Address coordinates could not be fetched, so default coordinates were used.`
              : success,
          );
        },
        error: (error: HttpErrorResponse) => {
          this.addressStatus.set(
            error.error?.message ?? 'Unable to save the address. Please try again.',
          );
        },
      });
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
    if (address.latitude == null || address.longitude == null) {
      this.addressStatus.set(
        'This address has no saved coordinates. Edit and save it to find its location first.',
      );
      return;
    }

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
      latitude: address.latitude,
      longitude: address.longitude,
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