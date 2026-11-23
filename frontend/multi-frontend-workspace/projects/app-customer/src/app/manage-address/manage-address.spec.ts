import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ManageAddress } from './manage-address';
import { GeocodingService, LatLng } from '../shared/geocoding.service';

const savedAddress = {
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
};

type TestAddress = Omit<typeof savedAddress, 'areaLocality' | 'landmark'> & {
  areaLocality: string | null;
  landmark: string | null;
};

describe('ManageAddress', () => {
  let httpTesting: HttpTestingController;
  let geocodedLocation: LatLng | null;
  let geocodingError: Error | null;

  beforeEach(async () => {
    geocodedLocation = null;
    geocodingError = null;
    await TestBed.configureTestingModule({
      imports: [ManageAddress],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: GeocodingService,
          useValue: {
            geocode: () =>
              geocodingError
                ? throwError(() => geocodingError)
                : of(geocodedLocation),
          },
        },
      ],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
    sessionStorage.setItem('customer_id', '42');
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.removeItem('customer_id');
  });

  function createComponentWithAddresses(
    addresses: TestAddress[] = [],
  ) {
    const fixture = TestBed.createComponent(ManageAddress);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.data-loading'),
    ).not.toBeNull();

    const request = httpTesting.expectOne(
      '/api/v1/customer/getAllSavedAddress/',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ userId: 42 });
    request.flush({
      success: 200,
      message: 'Addresses fetched successfully',
      data: addresses,
    });
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.data-loading'),
    ).toBeNull();
    return fixture;
  }

  it('loads and renders saved addresses from the customer API', () => {
    const fixture = createComponentWithAddresses([savedAddress]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('SAVED (1)');
    expect(element.textContent).toContain('Shanti Apartments');
  });

  it('does not request addresses with an invalid session customer ID', () => {
    sessionStorage.setItem('customer_id', 'not-a-number');
    const fixture = TestBed.createComponent(ManageAddress);
    fixture.detectChanges();

    expect(fixture.componentInstance.userId).toBeNull();
    expect(fixture.componentInstance.addressStatus()).toContain('Please log in');
  });

  it('shows location choices and reports simulated location success after three seconds', fakeAsync(() => {
    const fixture = createComponentWithAddresses();
    const component = fixture.componentInstance;
    component.openAddForm();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const mapButton = element.querySelector<HTMLButtonElement>(
      '.map-location-option',
    )!;
    expect(mapButton.disabled).toBe(true);

    element.querySelector<HTMLButtonElement>('.location-option')!.click();
    fixture.detectChanges();
    expect(component.isFetchingLocation()).toBe(true);
    expect(component.locationStatus()).toBe('');

    tick(2999);
    expect(component.locationStatus()).toBe('');
    tick(1);
    fixture.detectChanges();
    expect(component.isFetchingLocation()).toBe(false);
    expect(component.locationStatus()).toBe('Location fetched successfully.');
    expect(element.textContent).toContain('Location fetched successfully.');
  }));

  it('saves an address with fallback coordinates when geocoding finds no result', () => {
    const fixture = createComponentWithAddresses();
    const component = fixture.componentInstance;
    component.label = 'HOME';
    component.houseNo = '12';
    component.buildingStreet = 'Oak Street';
    component.areaLocality = 'Central';
    component.landmark = 'Library';
    component.city = 'Mumbai';
    component.state = 'Maharashtra';
    component.pincode = '400001';
    component.country = 'India';

    component.saveAddress();

    const request = httpTesting.expectOne('/api/v1/customer/saveNewAddress/');
    expect(request.request.body.latitude).toBe(19.1326204);
    expect(request.request.body.longitude).toBe(72.9109825);
    request.flush({ success: 200, message: 'Address added successfully' });
    httpTesting.expectOne('/api/v1/customer/getAllSavedAddress/').flush({
      success: 200,
      message: 'Addresses fetched successfully',
      data: [],
    });

    expect(component.addressStatus()).toContain('default coordinates were used');
  });

  it('saves an address with fallback coordinates when geocoding errors', () => {
    const fixture = createComponentWithAddresses();
    const component = fixture.componentInstance;
    geocodingError = new Error('Geocoding request failed');
    component.houseNo = '12';
    component.buildingStreet = 'Oak Street';
    component.areaLocality = 'Central';
    component.city = 'Mumbai';
    component.state = 'Maharashtra';
    component.pincode = '400001';
    component.country = 'India';

    component.saveAddress();

    const request = httpTesting.expectOne('/api/v1/customer/saveNewAddress/');
    expect(request.request.body.latitude).toBe(19.1326204);
    expect(request.request.body.longitude).toBe(72.9109825);
    request.flush({ success: 200, message: 'Address added successfully' });
    httpTesting.expectOne('/api/v1/customer/getAllSavedAddress/').flush({
      success: 200,
      message: 'Addresses fetched successfully',
      data: [],
    });

    expect(component.addressStatus()).toContain('default coordinates were used');
  });

  it('saves geocoded coordinates when the address is found', () => {
    const fixture = createComponentWithAddresses();
    const component = fixture.componentInstance;
    geocodedLocation = { lat: 19.076, lng: 72.8777 };
    component.houseNo = '12';
    component.buildingStreet = 'Oak Street';
    component.areaLocality = 'Central';
    component.city = 'Mumbai';
    component.state = 'Maharashtra';
    component.pincode = '400001';
    component.country = 'India';

    component.saveAddress();

    const request = httpTesting.expectOne(
      '/api/v1/customer/saveNewAddress/',
    );
    expect(request.request.body.latitude).toBe(19.076);
    expect(request.request.body.longitude).toBe(72.8777);
    request.flush({ success: 200, message: 'Address added successfully' });
    httpTesting.expectOne('/api/v1/customer/getAllSavedAddress/').flush({
      success: 200,
      message: 'Addresses fetched successfully',
      data: [],
    });
  });

  it('edits an address with its addressId', () => {
    const fixture = createComponentWithAddresses([savedAddress]);
    const component = fixture.componentInstance;
    geocodedLocation = { lat: 12.9716, lng: 77.5946 };
    component.openEditForm(component.addresses()[0]!);
    component.houseNo = '12B';

    component.saveAddress();

    const request = httpTesting.expectOne(
      '/api/v1/customer/editExistingAddress/',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      userId: 42,
      addressId: 101,
      label: 'HOME',
      houseNo: '12B',
      buildingStreet: 'Shanti Apartments, MG Road',
      areaLocality: 'Indiranagar',
      landmark: 'Opposite Metro Station',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946,
      isDefault: true,
    });
    request.flush({
      success: 200,
      data: { message: 'Address modified successfully' },
    });

    httpTesting.expectOne('/api/v1/customer/getAllSavedAddress/').flush({
      success: 200,
      message: 'Addresses fetched successfully',
      data: [{ ...savedAddress, houseNo: '12B' }],
    });
    fixture.detectChanges();
    expect(component.addressStatus()).toContain('Address modified successfully');
  });

  it('edits an address when optional locality and landmark values are null', () => {
    const address = { ...savedAddress, areaLocality: null, landmark: null };
    const fixture = createComponentWithAddresses([address]);
    const component = fixture.componentInstance;
    geocodedLocation = { lat: 12.9716, lng: 77.5946 };
    component.openEditForm(component.addresses()[0]!);

    expect(component.areaLocality).toBe('');
    expect(component.landmark).toBe('');
    expect(component.canSaveAddress()).toBe(true);

    component.saveAddress();

    const request = httpTesting.expectOne(
      '/api/v1/customer/editExistingAddress/',
    );
    expect(request.request.body).toEqual({
      userId: 42,
      addressId: 101,
      label: 'HOME',
      houseNo: 'B-205',
      buildingStreet: 'Shanti Apartments, MG Road',
      areaLocality: '',
      landmark: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946,
      isDefault: true,
    });
    request.flush({
      success: 200,
      data: { message: 'Address modified successfully' },
    });
    httpTesting.expectOne('/api/v1/customer/getAllSavedAddress/').flush({
      success: 200,
      message: 'Addresses fetched successfully',
      data: [address],
    });
  });

  it('deletes an address using the delete API', () => {
    const fixture = createComponentWithAddresses([savedAddress]);
    const component = fixture.componentInstance;

    component.deleteAddress(101);

    const request = httpTesting.expectOne(
      '/api/v1/customer/deleteAddress/',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ userId: 42, addressId: 101 });
    request.flush({
      success: 200,
      message: 'Address deleted successfully',
      data: {},
    });

    httpTesting.expectOne('/api/v1/customer/getAllSavedAddress/').flush({
      success: 200,
      message: 'Addresses fetched successfully',
      data: [],
    });
    fixture.detectChanges();
    expect(component.addresses()).toEqual([]);
    expect(component.addressStatus()).toBe('Address deleted successfully');
  });
});
