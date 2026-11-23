import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CompanionService } from './companion.service';

describe('CompanionService booking APIs', () => {
  let companion: CompanionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    companion = TestBed.inject(CompanionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a paginated active-booking page', async () => {
    const response = companion.activeBookings(2, 10);
    const request = http.expectOne(
      'http://localhost:8000/api/v1/companion/bookings/active/?page=2&page_size=10',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: { items: [], total: 11, page: 2, page_size: 10 } });
    await expect(response).resolves.toEqual({
      items: [],
      total: 11,
      page: 2,
      page_size: 10,
    });
  });

  it('loads the details for an assigned booking', async () => {
    const response = companion.bookingDetails(1001);
    const request = http.expectOne(
      'http://localhost:8000/api/v1/companion/bookings/1001/',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      data: {
        id: 1001,
        organization_id: 'org-1',
        customer_name: 'Customer Example',
        service_id: 3,
        service_name: 'Banking Assistance',
        status: 'assigned',
        scheduled_at: '2026-11-02T10:00:00+05:30',
        duration: 120,
        price_inr: '350.00',
        service_notes: null,
        pickup_address: 'Mumbai',
        latitude: null,
        longitude: null,
        cancellation_reason: null,
        cancelled_at: null,
        started_at: null,
        completed_at: null,
        assigned_at: '2026-11-02T09:00:00+05:30',
        cancelled_by: null,
        companion_rating: null,
        customer_comment: null,
      },
    });
    await expect(response).resolves.toMatchObject({
      id: 1001,
      customer_name: 'Customer Example',
      status: 'assigned',
      companion_rating: null,
      customer_comment: null,
    });
  });

  it('allows the dashboard to request a larger history page', async () => {
    const response = companion.pastJourneys(1, 50);
    const request = http.expectOne(
      'http://localhost:8000/api/v1/companion/bookings/history/?page=1&page_size=50',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: { items: [], total: 0, page: 1, page_size: 50 } });
    await expect(response).resolves.toMatchObject({
      items: [],
      total: 0,
      page_size: 50,
    });
  });

  it('preserves customer rating and comment in past journey responses', async () => {
    const response = companion.pastJourneys(1);
    const request = http.expectOne(
      'http://localhost:8000/api/v1/companion/bookings/history/?page=1&page_size=10',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      data: {
        items: [
          {
            id: 1001,
            service_name: 'Banking Assistance',
            status: 'completed',
            scheduled_at: '2026-11-02T10:00:00+05:30',
            cancellation_reason: null,
            companion_rating: 5,
            customer_comment: 'Very helpful.',
          },
        ],
        total: 1,
        page: 1,
        page_size: 10,
      },
    });

    await expect(response).resolves.toMatchObject({
      items: [
        {
          companion_rating: 5,
          customer_comment: 'Very helpful.',
        },
      ],
    });
  });

  it('sends the documented status and OTP payloads', async () => {
    const status = companion.updateBookingStatus(1001, 'on_the_way');
    const statusRequest = http.expectOne(
      'http://localhost:8000/api/v1/companion/bookings/1001/status/',
    );
    expect(statusRequest.request.method).toBe('PATCH');
    expect(statusRequest.request.body).toEqual({ status: 'on_the_way' });
    statusRequest.flush({ data: { id: 1001, status: 'on_the_way' } });
    await expect(status).resolves.toEqual({ id: 1001, status: 'on_the_way' });

    const start = companion.startBooking(1001, '012345');
    const startRequest = http.expectOne(
      'http://localhost:8000/api/v1/companion/bookings/1001/start/',
    );
    expect(startRequest.request.method).toBe('POST');
    expect(startRequest.request.body).toEqual({ start_code: '012345' });
    startRequest.flush({
      data: { id: 1001, status: 'in_progress', started_at: '2026-11-02T10:05:00+05:30' },
    });
    await expect(start).resolves.toMatchObject({ status: 'in_progress' });

    const complete = companion.completeBooking(1001, '654321');
    const completeRequest = http.expectOne(
      'http://localhost:8000/api/v1/companion/bookings/1001/complete/',
    );
    expect(completeRequest.request.method).toBe('POST');
    expect(completeRequest.request.body).toEqual({ end_code: '654321' });
    completeRequest.flush({
      data: { id: 1001, status: 'completed', completed_at: '2026-11-02T12:00:00+05:30' },
    });
    await expect(complete).resolves.toMatchObject({ status: 'completed' });
  });
});
