import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ManageAddress } from './manage-address';

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

describe('ManageAddress', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAddress],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
    sessionStorage.setItem('customer_id', '42');
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.removeItem('customer_id');
  });

  function createComponentWithAddresses(
    addresses: Array<typeof savedAddress> = [],
  ) {
    const fixture = TestBed.createComponent(ManageAddress);
    fixture.detectChanges();

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

  it('saves a new address using the save API', () => {
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

    const request = httpTesting.expectOne(
      '/api/v1/customer/saveNewAddress/',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      userId: 42,
      label: 'HOME',
      houseNo: '12',
      buildingStreet: 'Oak Street',
      areaLocality: 'Central',
      landmark: 'Library',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India',
      latitude: null,
      longitude: null,
      isDefault: true,
    });
    request.flush({
      success: 200,
      data: { message: 'Address added successfully' },
    });

    const refreshRequest = httpTesting.expectOne(
      '/api/v1/customer/getAllSavedAddress/',
    );
    refreshRequest.flush({
      success: 200,
      message: 'Addresses fetched successfully',
      data: [savedAddress],
    });
    fixture.detectChanges();
    expect(component.addressStatus()).toBe('Address added successfully');
  });

  it('edits an address with its addressId', () => {
    const fixture = createComponentWithAddresses([savedAddress]);
    const component = fixture.componentInstance;
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
      latitude: null,
      longitude: null,
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
    expect(component.addressStatus()).toBe('Address modified successfully');
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
