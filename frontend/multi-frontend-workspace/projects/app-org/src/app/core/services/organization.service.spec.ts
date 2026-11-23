import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  let organizations: OrganizationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    organizations = TestBed.inject(OrganizationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads all organization bookings across API pages', async () => {
    const booking = (id: number) => ({
      id,
      service_id: 1,
      service_name: 'Service',
      customer_name: 'Customer',
      status: 'completed',
      scheduled_at: '2026-01-01T10:00:00Z',
      duration: 1,
      price_inr: '100',
      pickup_address: null,
      organization_rating: null,
      customer_comment: null,
      latitude: null,
      longitude: null,
      companion_id: null,
      companion_name: null,
    });
    const requestPromise = organizations.allBookings();
    const firstPageRequest = http.expectOne(
      'http://localhost:8000/api/v1/org/bookings/?page=1&page_size=50',
    );
    firstPageRequest.flush({
      data: {
        items: [booking(1)],
        total: 51,
        page: 1,
        page_size: 50,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    const secondPageRequest = http.expectOne(
      'http://localhost:8000/api/v1/org/bookings/?page=2&page_size=50',
    );
    secondPageRequest.flush({
      data: {
        items: [booking(2)],
        total: 51,
        page: 2,
        page_size: 50,
      },
    });

    await expect(requestPromise).resolves.toEqual([booking(1), booking(2)]);
  });

  it('fetches a companion detail using the encoded ID and bearer token', async () => {
    const requestPromise = organizations.companionDetails('companion/1');
    const request = http.expectOne(
      'http://localhost:8000/api/v1/org/companions/companion%2F1/',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      data: {
        companion_id: 'companion/1',
        name: 'Sam Example',
        email: 'sam@example.com',
        mobile: '1234567890',
        organization_id: 'organization-1',
        languages_known: ['English'],
        speciality: 'First aid',
        experience_years: 3,
        is_active: true,
        availability_status: 'available',
        service_ids: [4],
      },
    });

    await expect(requestPromise).resolves.toEqual({
      companion_id: 'companion/1',
      name: 'Sam Example',
      email: 'sam@example.com',
      mobile: '1234567890',
      organization_id: 'organization-1',
      languages_known: ['English'],
      speciality: 'First aid',
      experience_years: 3,
      is_active: true,
      availability_status: 'available',
      service_ids: [4],
    });
  });
});
