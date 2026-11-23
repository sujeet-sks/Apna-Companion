import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

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
  latitude: 12.9716,
  longitude: 77.5946,
  isDefault: true,
};

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    sessionStorage.setItem('customer_id', '42');
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.removeItem('customer_id');
    sessionStorage.removeItem('full_name');
    sessionStorage.removeItem('mobile_number');
  });

  it('should show booking modes and quick links', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();

    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/customer/getAllSavedAddress/')
      .flush({ success: 200, message: 'Addresses fetched', data: [] });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Need a companion');
    expect(element.textContent).toContain('Formal booking');
    expect(element.textContent).toContain('Everyday outing');
    expect(element.textContent).toContain('Hospitals');
    expect(element.querySelector('.organization-results')).toBeNull();
    expect(element.querySelector('a[routerLink="/bookings"]')).toBeTruthy();
    expect(element.querySelector('a[routerLink="/help"]')).toBeTruthy();
  });

  it('shows organizations only after a successful Find Companion response', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const httpTesting = TestBed.inject(HttpTestingController);

    httpTesting.expectOne('/api/v1/customer/getAllSavedAddress/').flush({
      success: 200,
      message: 'Addresses fetched',
      data: [savedAddress],
    });
    fixture.detectChanges();
    expect(element.querySelector('.organization-results')).toBeNull();

    fixture.componentInstance.selectOption('Hospitals');
    element.querySelector<HTMLButtonElement>('.find-companion-button')!.click();
    fixture.detectChanges();

    const request = httpTesting.expectOne(
      '/api/v1/customer/getOrganizationDetails/',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      userID: '42',
      purpose: 'Hospitals',
      latitude: '12.9716',
      longitude: '77.5946',
      address:
        'B-205, Shanti Apartments, MG Road, Indiranagar, Opposite Metro Station, Bengaluru, Karnataka, 560038, India',
    });
    request.flush({
      success: 200,
      message: 'Organizations fetched successfully.',
      data: {
        organizations: [
          {
            organizationId: 501,
            name: 'Sahara Care Foundation',
            organizationType: 'NGO',
            logoUrl: '',
            rating: 4.6,
            totalReviews: 238,
            completedBookings: 1450,
            service: [],
          },
        ],
      },
    });
    fixture.detectChanges();

    expect(element.querySelector('.organization-results')).not.toBeNull();
    expect(element.textContent).toContain('Sahara Care Foundation');
  });

  it('does not search without a default address with valid coordinates', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const httpTesting = TestBed.inject(HttpTestingController);

    httpTesting.expectOne('/api/v1/customer/getAllSavedAddress/').flush({
      success: 200,
      message: 'Addresses fetched',
      data: [],
    });
    fixture.detectChanges();

    fixture.componentInstance.selectOption('hospital');
    element.querySelector<HTMLButtonElement>('.find-companion-button')!.click();
    fixture.detectChanges();

    expect(element.textContent).toContain(
      'Set a default address before finding a companion.',
    );
    httpTesting.expectNone('/api/v1/customer/getOrganizationDetails/');
  });

  it('loads the default address using the session customer ID', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.data-loading'),
    ).not.toBeNull();
    const httpTesting = TestBed.inject(HttpTestingController);
    const request = httpTesting.expectOne('/api/v1/customer/getAllSavedAddress/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ userId: 42 });
    request.flush({
      success: 200,
      message: 'Addresses fetched successfully',
      data: [savedAddress],
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.data-loading')).toBeNull();
    expect(element.textContent).toContain('Default address');
    expect(element.textContent).toContain('Shanti Apartments, MG Road');
    expect(element.textContent).not.toContain('Loading saved addresses');
  });

  it('accepts a single address object in the successful response', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();

    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/customer/getAllSavedAddress/')
      .flush(savedAddress);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Default address',
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Bengaluru',
    );
  });

  it('shows +91 and sends it with the customer mobile number', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/v1/customer/getAllSavedAddress/').flush({
      success: 200,
      message: 'Addresses fetched',
      data: [],
    });

    const organization = {
      organizationId: 501,
      name: 'Sahara Care Foundation',
      organizationType: 'NGO',
      logoUrl: '',
      rating: 4.6,
      totalReviews: 0,
      completedBookings: 0,
      service: [
        {
          serviceId: 1,
          serviceName: 'Hospital visit',
          serviceDescription: '',
          servicePrice: 0,
        },
      ],
    };
    const component = fixture.componentInstance;
    component.organizations.set([organization]);
    component.selectedServiceId = 1;
    component.customerName = 'Test Customer';
    component.customerMobile = '9876543210';
    component.bookingDate = '2026-11-25';
    component.bookingTime = '10:00';
    component.bookingDurationHours = 2;
    component.bookingDurationMinutes = 30;
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.mobile-country-code')?.textContent).toContain('+91');
    expect(component.canSubmitService()).toBe(true);

    component.submitService(organization);
    const request = httpTesting.expectOne('/api/v1/customer/requestBooking/');
    expect(request.request.body.contactPhone).toBe('+919876543210');
    expect(request.request.body.durationOfBooking).toBe(150);
    request.flush(
      { message: 'Invalid request' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
  });

  it('leaves booking contact details blank for the user to enter', () => {
    sessionStorage.setItem('full_name', 'Test Customer');
    sessionStorage.setItem('mobile_number', '9876543210');

    const fixture = TestBed.createComponent(Home);
    expect(fixture.componentInstance.customerName).toBe('');
    expect(fixture.componentInstance.customerMobile).toBe('');
  });
});
