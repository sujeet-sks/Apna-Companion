import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Register } from './register';

describe('Register', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('renders the required registration fields and keeps submission disabled until valid', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Create your account');
    expect(element.querySelectorAll('input[required]')).toHaveLength(4);
    expect(element.querySelector('select[required]')).not.toBeNull();
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(element.querySelector('a[href="/login"]')?.textContent).toContain('Log in');
  });

  it('keeps Send OTP disabled until every registration field is entered', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const sendOtpButton = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;

    setInput(element, '#register-name', 'Asha Rao');
    setInput(element, '#register-dob', '1998-04-12');
    setSelect(element, '#register-gender', 'female');
    setInput(element, '#register-email', 'asha@example.com');
    fixture.detectChanges();
    expect(sendOtpButton.disabled).toBe(true);

    setInput(element, '#register-mobile', '9876543210');
    fixture.detectChanges();
    expect(sendOtpButton.disabled).toBe(false);
  });

  it('disables dates of birth after today', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();

    const dateInput = fixture.nativeElement.querySelector(
      '#register-dob',
    ) as HTMLInputElement;
    const today = new Date();
    const expectedMax = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    expect(dateInput.max).toBe(expectedMax);
  });

  it('requires mobile OTP verification before registering the customer', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    setInput(element, '#register-name', 'Asha Rao');
    setInput(element, '#register-dob', '1998-04-12');
    setSelect(element, '#register-gender', 'female');
    setInput(element, '#register-email', 'asha@example.com');
    setInput(element, '#register-mobile', '9876543210');
    fixture.detectChanges();

    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    const sendOtpRequest = httpTesting.expectOne('/generateOTP');
    expect(sendOtpRequest.request.method).toBe('POST');
    expect(sendOtpRequest.request.body).toEqual({ mobile: '+919876543210' });
    sendOtpRequest.flush({});
    fixture.detectChanges();

    const otpInput = element.querySelector<HTMLInputElement>('#register-otp');
    const verifyButton =
      element.querySelectorAll('form')[1].querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(otpInput).not.toBeNull();
    expect(verifyButton?.disabled).toBe(true);
    expect(element.textContent).not.toContain('Create account');

    setInput(element, '#register-otp', '123456');
    fixture.detectChanges();
    expect(verifyButton?.disabled).toBe(false);
    element.querySelectorAll('form')[1].dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    const verifyOtpRequest = httpTesting.expectOne('/submitOTP');
    expect(verifyOtpRequest.request.body).toEqual({
      mobile: '+919876543210',
      otp: '123456',
    });
    verifyOtpRequest.flush({});
    fixture.detectChanges();

    const registerButton = element.querySelector<HTMLButtonElement>('button[type="button"]')!;
    expect(registerButton.disabled).toBe(false);
    registerButton.click();
    const registerRequest = httpTesting.expectOne('/registerCustomer');
    expect(registerRequest.request.body).toEqual({
      fullName: 'Asha Rao',
      dob: '1998-04-12',
      gender: 'female',
      email: 'asha@example.com',
      mobile: '+919876543210',
    });
    registerRequest.flush({});
    fixture.detectChanges();

    expect(element.textContent).toContain('Your account has been registered successfully.');
  });

  it('clears OTP verification when the mobile number changes', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    setInput(element, '#register-name', 'Asha Rao');
    setInput(element, '#register-dob', '1998-04-12');
    setSelect(element, '#register-gender', 'female');
    setInput(element, '#register-email', 'asha@example.com');
    setInput(element, '#register-mobile', '9876543210');
    fixture.detectChanges();
    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    httpTesting.expectOne('/generateOTP').flush({});
    fixture.detectChanges();

    setInput(element, '#register-otp', '123456');
    fixture.detectChanges();
    element.querySelectorAll('form')[1].dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    httpTesting.expectOne('/submitOTP').flush({});
    fixture.detectChanges();

    setInput(element, '#register-mobile', '9123456789');
    fixture.detectChanges();

    expect(element.querySelector('#register-otp')).toBeNull();
    expect(element.textContent).not.toContain('Mobile number verified.');
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.textContent).toContain(
      'Send OTP',
    );
  });
});

function setInput(element: HTMLElement, selector: string, value: string): void {
  const input = element.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function setSelect(element: HTMLElement, selector: string, value: string): void {
  const select = element.querySelector<HTMLSelectElement>(selector)!;
  select.value = value;
  select.dispatchEvent(new Event('change'));
}
