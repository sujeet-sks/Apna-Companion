import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService, AUTH_TOKEN_STORAGE_KEY } from './auth.service';
import { authInterceptor } from '../interceptors/auth.interceptor';

describe('Organization authentication', () => {
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

  it('logs in, fetches organization status and stores the bearer token', async () => {
    const login = auth.login('org@example.com', 'password123');
    http.expectOne('http://localhost:8000/api/v1/org/login/').flush({
      status_code: 200,
      data: { access_token: 'org-token', expires_in: 43200, organization_id: 'org-id' },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const me = http.expectOne('http://localhost:8000/api/v1/org/me/');
    expect(me.request.headers.get('Authorization')).toBe('Bearer org-token');
    me.flush({
      status_code: 200,
      data: {
        email: 'org@example.com',
        organization_id: 'org-id',
        approval_status: 'approved',
      },
    });
    await login;

    expect(auth.session()?.approval_status).toBe('approved');
    expect(auth.signedIn).toBe(true);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('org-token');
  });

  it('submits registration verification and clears the pending request', async () => {
    const start = auth.beginRegistration({
      organization_name: 'Example',
      organization_type: 'ngo',
      email: 'org@example.com',
      password: 'password123',
      confirm_password: 'password123',
      address: 'Example address',
      document_type: 'registration_certificate',
      document_url: 'https://example.com/document.pdf',
    });
    http.expectOne('http://localhost:8000/api/v1/org/register/start/').flush({
      status_code: 200,
      data: { verification_id: 'verification-id' },
    });
    await start;

    const complete = auth.completeRegistration('123456');
    const request = http.expectOne('http://localhost:8000/api/v1/org/register/complete/');
    expect(request.request.body).toEqual({
      verification_id: 'verification-id',
      email_code: '123456',
    });
    request.flush({ status_code: 201, data: { message: 'submitted' } });
    await complete;
    await expect(auth.completeRegistration('123456')).rejects.toThrow(
      'Start organization registration again to request a new code.',
    );
  });

  it('ends the local session even if logout cannot reach the server', async () => {
    const login = auth.login('org@example.com', 'password123');
    http.expectOne('http://localhost:8000/api/v1/org/login/').flush({
      status_code: 200,
      data: { access_token: 'org-token', expires_in: 43200, organization_id: 'org-id' },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    http.expectOne('http://localhost:8000/api/v1/org/me/').flush({
      status_code: 200,
      data: { email: 'org@example.com', organization_id: 'org-id', approval_status: 'pending' },
    });
    await login;

    const logout = auth.logout();
    http.expectOne('http://localhost:8000/api/v1/org/logout/').flush(
      { message: 'unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await expect(logout).rejects.toThrow();
    expect(auth.signedIn).toBe(false);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
