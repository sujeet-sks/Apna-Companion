import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { UserProfile } from './user-profile';

describe('UserProfile', () => {
  const profileResponse = {
    customer: {
      customer_id: 123,
      full_name: 'API Customer',
      email_id: 'api@example.com',
      mobile_number: '+919876543210',
      dob: '1990-01-01',
      gender: 'Other',
      account_status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserProfile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    sessionStorage.clear();
    sessionStorage.setItem('customer_id', '42');
    sessionStorage.setItem('full_name', 'Session Customer');
    sessionStorage.setItem('email_id', 'session@example.com');
    sessionStorage.setItem('mobile_number', '1111111111');
    sessionStorage.setItem('access_token', 'test-token');
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
  });

  function createLoadedFixture() {
    const fixture = TestBed.createComponent(UserProfile);
    fixture.detectChanges();

    const request = TestBed.inject(HttpTestingController).expectOne(
      (request) =>
        request.url === '/api/customer/me/' &&
        request.params.get('identifier') === '',
    );
    expect(request.request.method).toBe('GET');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.profile-loading'),
    ).not.toBeNull();
    request.flush(profileResponse);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.profile-loading'),
    ).toBeNull();
    return fixture;
  }

  it('shows customer profile details from the profile API', () => {
    const fixture = createLoadedFixture();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Your profile');
    expect(element.querySelector('#profile-name')?.textContent).toContain('API Customer');
    expect(element.textContent).toContain('api@example.com');
    expect(element.textContent).toContain('+919876543210');
    expect(element.textContent).toContain('1990-01-01');
    expect(element.textContent).toContain('Other');
    expect(element.textContent).not.toContain('session@example.com');
    expect(element.querySelector('.logout-button')?.textContent).toContain('Log out');
  });

  it('shows an error and lets the customer retry when profile loading fails', () => {
    const fixture = TestBed.createComponent(UserProfile);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne((request) => request.url === '/api/customer/me/')
      .flush(
        { message: 'Profile unavailable' },
        { status: 500, statusText: 'Server Error' },
      );
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Profile unavailable',
    );
    element.querySelector<HTMLButtonElement>('.retry-profile-button')!.click();
    const retryRequest = TestBed.inject(HttpTestingController).expectOne(
      (request) =>
        request.url === '/api/customer/me/' &&
        request.params.get('identifier') === '',
    );
    retryRequest.flush(profileResponse);
    fixture.detectChanges();
    expect(element.querySelector('#profile-name')?.textContent).toContain(
      'API Customer',
    );
  });

  it('calls the logout API and clears the session before navigating to login', () => {
    const fixture = createLoadedFixture();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(
      Promise.resolve(true),
    );
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.logout-button')!
      .click();

    const request = TestBed.inject(HttpTestingController).expectOne(
      '/api/customer/logout/',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ identifier: '' });
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('.logout-button')!.disabled,
    ).toBe(true);

    request.flush({ message: 'Logged out' });
    expect(sessionStorage.length).toBe(0);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('keeps the session and displays an error if logout fails', () => {
    const fixture = createLoadedFixture();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.logout-button')!
      .click();

    TestBed.inject(HttpTestingController)
      .expectOne('/api/customer/logout/')
      .flush(
        { message: 'Logout failed' },
        { status: 500, statusText: 'Server Error' },
      );
    fixture.detectChanges();

    expect(sessionStorage.getItem('access_token')).toBe('test-token');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')
        ?.textContent,
    ).toContain('Logout failed');
  });
});
