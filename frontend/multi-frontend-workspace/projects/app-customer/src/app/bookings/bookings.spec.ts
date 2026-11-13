import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Bookings } from './bookings';

describe('Bookings', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bookings],
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
  });

  it('should show the empty bookings state', () => {
    const fixture = TestBed.createComponent(Bookings);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Your bookings will appear here',
    );
    TestBed.inject(HttpTestingController).expectOne(
      '/api/v1/customer/getAllBookingDetails/',
    ).flush({ success: 200, data: [] });
  });

  it('uses the customer ID from session storage when loading bookings', () => {
    const fixture = TestBed.createComponent(Bookings);
    const httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const request = httpTesting.expectOne(
      '/api/v1/customer/getAllBookingDetails/',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ userID: '42' });
    request.flush({ success: 200, data: [] });
    httpTesting.verify();
  });
});
