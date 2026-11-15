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

  it('shows empty states when the APIs return no bookings', () => {
    const fixture = TestBed.createComponent(Bookings);
    const httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.data-loading'),
    ).toHaveLength(2);

    const currentRequest = httpTesting.expectOne(
      '/api/v1/customer/getCurrentBookingDetails/',
    );
    const pastRequest = httpTesting.expectOne(
      '/api/v1/customer/getAllBookingDetails/',
    );
    currentRequest.flush({ success: 200, data: [] });
    pastRequest.flush({ success: 200, data: [] });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.data-loading')).toBeNull();
    const text = element.textContent;
    expect(text).toContain('No current bookings.');
    expect(text).toContain('No past bookings.');
  });

  it('renders current and past bookings from their API responses', () => {
    const fixture = TestBed.createComponent(Bookings);
    const httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const currentRequest = httpTesting.expectOne(
      '/api/v1/customer/getCurrentBookingDetails/',
    );
    const pastRequest = httpTesting.expectOne(
      '/api/v1/customer/getAllBookingDetails/',
    );
    for (const request of [currentRequest, pastRequest]) {
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ userID: '42' });
    }

    currentRequest.flush({
      success: 200,
      data: [
        {
          bookingId: 'CUR-1',
          status: 'pending',
          serviceName: 'Current service from API',
          organizationname: 'Current organization',
          rating: 4.5,
          companion: null,
          scheduletimestamp: '2026-11-25T10:00:00+05:30',
          durationOfBooking: 2,
          contactName: 'Asha Customer',
          contactPhone: '+919876543210',
          startOtp: '1234',
          endOtp: '5678',
        },
      ],
    });
    pastRequest.flush({
      success: 200,
      data: [
        {
          bookingId: 'PST-1',
          status: 'completed',
          service: 'Past service from API',
          organizationname: 'Past organization',
          rating: 4.6,
          companion: { name: 'Past companion', phone: '9876500000', rating: 4.9 },
          scheduletimestamp: '2026-11-20T08:30:00+05:30',
          durationOfBooking: '3 hours',
          comments: 'Loaded from API',
        },
      ],
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Current service from API');
    expect(text).toContain('Past service from API');
    expect(text).toContain('Asha Customer');
    expect(text).toContain('+919876543210');
    expect(text).toContain('Companion not assigned yet.');
  });

  it('lets customers review completed past bookings without comments', () => {
    const fixture = TestBed.createComponent(Bookings);
    const httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpTesting.expectOne('/api/v1/customer/getCurrentBookingDetails/').flush({
      success: 200,
      data: [],
    });
    httpTesting.expectOne('/api/v1/customer/getAllBookingDetails/').flush({
      success: 200,
      data: [
        {
          bookingId: 'PST-REVIEW',
          status: 'completed',
          service: 'Completed booking',
          organizationname: 'Test organization',
          rating: 4.5,
          companion: { name: 'Test companion', phone: '9876543210', rating: 4.8 },
          scheduletimestamp: '2026-11-20T08:30:00+05:30',
          durationOfBooking: '2 hours',
          comments: null,
        },
        {
          bookingId: 'PST-REVIEWED',
          status: 'completed',
          service: 'Previously reviewed booking',
          organizationname: 'Test organization',
          rating: 4.5,
          companion: { name: 'Test companion', phone: '9876543210', rating: 4.8 },
          scheduletimestamp: '2026-11-19T08:30:00+05:30',
          durationOfBooking: '2 hours',
          comments: 'Already reviewed',
        },
        {
          bookingId: 'PST-REJECTED',
          status: 'rejected',
          service: 'Rejected booking',
          organizationname: 'Test organization',
          rating: 4.5,
          companion: { name: 'Test companion', phone: '9876543210', rating: 4.8 },
          scheduletimestamp: '2026-11-18T08:30:00+05:30',
          durationOfBooking: '2 hours',
          comments: null,
        },
      ],
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.review-section')).toHaveLength(1);

    const component = fixture.componentInstance;
    component.setOrganizationRating('PST-REVIEW', 5);
    component.setCompanionRating('PST-REVIEW', 4);
    component.reviewComments['PST-REVIEW'] = 'Great support.';
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.review-section .submit-review-button')!.click();

    const reviewRequest = httpTesting.expectOne('/api/v1/customer/submitReview/');
    expect(reviewRequest.request.body).toEqual({
      userID: '42',
      bookingId: 'PST-REVIEW',
      organizationRating: 5,
      companionRating: 4,
      Comment: 'Great support.',
    });
    reviewRequest.flush({ success: 200, message: 'Review submitted' });
    fixture.detectChanges();

    expect(element.querySelectorAll('.review-section')).toHaveLength(0);
    expect(element.textContent).toContain('Comments: Great support.');
  });

  it('uses distinct labels and colors for each current booking status', () => {
    const statuses = [
      ['pending', 'Pending', 'pending'],
      ['accepted', 'Accepted', 'accepted'],
      ['assigned', 'Assigned', 'assigned'],
      ['on_the_way', 'On the way', 'on-the-way'],
      ['arrived', 'Arrived', 'arrived'],
      ['in_progress', 'In progress', 'in-progress'],
      ['completed', 'Completed', 'completed'],
    ] as const;
    const fixture = TestBed.createComponent(Bookings);
    const httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpTesting.expectOne('/api/v1/customer/getCurrentBookingDetails/').flush({
      success: 200,
      data: statuses.map(([status], index) => ({
        bookingId: `BOOK-${index}`,
        status,
        serviceName: `Service ${index}`,
        organizationname: 'Test organization',
        rating: 4.5,
        companion: null,
        scheduletimestamp: '2026-11-25T10:00:00+05:30',
        durationOfBooking: 2,
        contactName: 'Test Customer',
        contactPhone: '+919876543210',
        startOtp: '1234',
        endOtp: '5678',
      })),
    });
    httpTesting.expectOne('/api/v1/customer/getAllBookingDetails/').flush({
      success: 200,
      data: [],
    });
    fixture.detectChanges();

    const badges = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.status-badge'),
    );
    expect(badges).toHaveLength(statuses.length);
    statuses.forEach(([, label, cssClass], index) => {
      expect(badges[index].textContent?.trim()).toBe(label);
      expect(badges[index].classList.contains(cssClass)).toBe(true);
    });
  });
});
