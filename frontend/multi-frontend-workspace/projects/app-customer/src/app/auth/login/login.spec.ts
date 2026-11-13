import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Login } from './login';

describe('Login', () => {
  beforeEach(async () => {
    localStorage.removeItem('userID');
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('should render the login form', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Log in to your account');
    expect(element.querySelectorAll('input[formControlName]')).toHaveLength(2);
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(element.querySelector('a[href="/register"]')?.textContent).toContain('Create an account');
  });

  it.each(['person@example.com', '9876543210', '+1 (415) 555-2671'])(
    'enables login for a valid email or mobile number: %s',
    (username) => {
      const fixture = TestBed.createComponent(Login);
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      const usernameInput = element.querySelector<HTMLInputElement>('#login-username')!;
      const passwordInput = element.querySelector<HTMLInputElement>('#login-password')!;
      usernameInput.value = username;
      usernameInput.dispatchEvent(new Event('input'));
      passwordInput.value = 'secret';
      passwordInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(
        false,
      );
    },
  );

  it('keeps login disabled when the identifier is invalid', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const usernameInput = element.querySelector<HTMLInputElement>('#login-username')!;
    const passwordInput = element.querySelector<HTMLInputElement>('#login-password')!;
    usernameInput.value = 'not an identifier';
    usernameInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'secret';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
  });

  it('toggles password visibility', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const passwordInput = element.querySelector<HTMLInputElement>('#login-password')!;
    const toggleButton = element.querySelector<HTMLButtonElement>('.password-toggle')!;

    expect(passwordInput.type).toBe('password');
    expect(toggleButton.getAttribute('aria-label')).toBe('Show password');
    toggleButton.click();
    fixture.detectChanges();

    expect(passwordInput.type).toBe('text');
    expect(toggleButton.getAttribute('aria-label')).toBe('Hide password');
    toggleButton.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('password');
  });

  it('submits the identifier and password and stores the returned session', () => {
    const fixture = TestBed.createComponent(Login);
    const httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const usernameInput = element.querySelector<HTMLInputElement>('#login-username')!;
    const passwordInput = element.querySelector<HTMLInputElement>('#login-password')!;
    usernameInput.value = 'person@example.com';
    usernameInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'secret';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const request = httpTesting.expectOne('/api/customer/login/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      identifier: 'person@example.com',
      password: 'secret',
    });
    request.flush({
      access_token: 'test-token',
      token_type: 'Bearer',
      expires_in: 3600,
      customer: {
        customer_id: 42,
        full_name: 'Test Customer',
        email_id: 'person@example.com',
        mobile_number: '9876543210',
        dob: '',
        gender: '',
        account_status: 'active',
        created_at: '',
        updated_at: '',
      },
    });

    expect(sessionStorage.getItem('access_token')).toBe('test-token');
    expect(sessionStorage.getItem('customer_id')).toBe('42');
    expect(sessionStorage.getItem('full_name')).toBe('Test Customer');
    expect(sessionStorage.getItem('email_id')).toBe('person@example.com');
    expect(sessionStorage.getItem('mobile_number')).toBe('9876543210');
    expect(localStorage.getItem('userID')).toBeNull();
    httpTesting.verify();
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('customer_id');
    sessionStorage.removeItem('full_name');
    sessionStorage.removeItem('email_id');
    sessionStorage.removeItem('mobile_number');
  });

  it('resets the login button after a failed login request', () => {
    const fixture = TestBed.createComponent(Login);
    const httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const usernameInput = element.querySelector<HTMLInputElement>('#login-username')!;
    const passwordInput = element.querySelector<HTMLInputElement>('#login-password')!;
    usernameInput.value = 'person@example.com';
    usernameInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'incorrect';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const request = httpTesting.expectOne('/api/customer/login/');
    expect(element.querySelector('button[type="submit"]')?.textContent).toContain(
      'Logging in...',
    );
    request.flush(
      { message: 'Invalid credentials.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    const submitButton =
      element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submitButton.disabled).toBe(false);
    expect(submitButton.textContent).toContain('Log in');
    expect(element.textContent).toContain('Invalid credentials.');
    httpTesting.verify();
  });
});
