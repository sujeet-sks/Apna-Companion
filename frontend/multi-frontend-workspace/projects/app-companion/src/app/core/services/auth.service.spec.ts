import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService, AUTH_TOKEN_STORAGE_KEY } from './auth.service';
import { authInterceptor } from '../interceptors/auth.interceptor';

describe('Companion authentication', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('logs in, fetches companion identity and stores the bearer token', async () => {
    const login = auth.login('companion@example.com', 'password123');
    http.expectOne('http://localhost:8000/api/v1/companion/login/').flush({
      status_code: 200,
      data: {
        access_token: 'companion-token',
        expires_in: 43200,
        companion_id: 'companion-id',
        organization_id: 'org-id',
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const me = http.expectOne('http://localhost:8000/api/v1/companion/me/');
    expect(me.request.headers.get('Authorization')).toBe('Bearer companion-token');
    me.flush({
      status_code: 200,
      data: {
        email: 'companion@example.com',
        companion_id: 'companion-id',
        organization_id: 'org-id',
      },
    });
    await login;

    expect(auth.session()?.account_id).toBe('companion-id');
    expect(auth.session()?.organization_id).toBe('org-id');
    expect(auth.signedIn).toBe(true);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('companion-token');
  });

  it('uses the companion reset endpoint and request id', async () => {
    const start = auth.beginReset('companion@example.com');
    http.expectOne('http://localhost:8000/api/v1/companion/forgot-password/request/').flush({
      status_code: 200,
      data: { request_id: 'reset-id' },
    });
    await start;

    const reset = auth.completeReset('123456', 'newpass123', 'newpass123');
    const request = http.expectOne(
      'http://localhost:8000/api/v1/companion/forgot-password/complete/',
    );
    expect(request.request.body).toEqual({
      request_id: 'reset-id',
      code: '123456',
      new_password: 'newpass123',
      confirm_password: 'newpass123',
    });
    request.flush({ status_code: 200, data: { message: 'updated' } });
    await reset;
  });

  it('clears the session after a password change because the token is invalidated', async () => {
    const login = auth.login('companion@example.com', 'password123');
    http.expectOne('http://localhost:8000/api/v1/companion/login/').flush({
      status_code: 200,
      data: {
        access_token: 'companion-token',
        expires_in: 43200,
        companion_id: 'companion-id',
        organization_id: 'org-id',
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    http.expectOne('http://localhost:8000/api/v1/companion/me/').flush({
      status_code: 200,
      data: {
        email: 'companion@example.com',
        companion_id: 'companion-id',
        organization_id: 'org-id',
      },
    });
    await login;

    const change = auth.changePassword('oldpass123', 'newpass123', 'newpass123');
    http.expectOne('http://localhost:8000/api/v1/companion/change-password/').flush({
      status_code: 200,
      data: { message: 'changed' },
    });
    await change;

    expect(auth.signedIn).toBe(false);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
