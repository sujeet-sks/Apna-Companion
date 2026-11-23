import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '../../shared/toast.service';
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
    expect(element.querySelectorAll('input[required]')).toHaveLength(6);
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
    expect(sendOtpButton.disabled).toBe(true);

    setInput(element, '#register-password', 'secret');
    setInput(element, '#register-confirm-password', 'different');
    fixture.detectChanges();
    expect(sendOtpButton.disabled).toBe(true);

    setInput(element, '#register-confirm-password', 'secret');
    fixture.detectChanges();
    expect(sendOtpButton.disabled).toBe(false);
  });

  it('lets the customer show or hide each password independently', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const passwordInput =
      element.querySelector<HTMLInputElement>('#register-password')!;
    const confirmPasswordInput =
      element.querySelector<HTMLInputElement>('#register-confirm-password')!;
    const passwordToggle =
      element.querySelectorAll<HTMLButtonElement>('.password-toggle')[0]!;
    const confirmPasswordToggle =
      element.querySelectorAll<HTMLButtonElement>('.password-toggle')[1]!;

    expect(passwordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');

    passwordToggle.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('text');
    expect(confirmPasswordInput.type).toBe('password');

    confirmPasswordToggle.click();
    fixture.detectChanges();
    expect(confirmPasswordInput.type).toBe('text');
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

  it('starts registration and completes it with email and mobile OTPs', () => {
    const fixture = TestBed.createComponent(Register);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(
      Promise.resolve(true),
    );
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    setInput(element, '#register-name', 'Asha Rao');
    setInput(element, '#register-dob', '1998-04-12');
    setSelect(element, '#register-gender', 'female');
    setInput(element, '#register-email', 'asha@example.com');
    setInput(element, '#register-mobile', '9876543210');
    setInput(element, '#register-password', 'secret');
    setInput(element, '#register-confirm-password', 'secret');
    fixture.detectChanges();

    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    const startRequest = httpTesting.expectOne('/api/customer/register/start/');
    expect(startRequest.request.method).toBe('POST');
    expect(startRequest.request.body).toEqual({
      full_name: 'Asha Rao',
      email_id: 'asha@example.com',
      mobile_number: '9876543210',
      dob: '1998-04-12',
      gender: 'female',
      password: 'secret',
      confirm_password: 'secret',
    });
    startRequest.flush({ verification_id: 'verification-123', expires_in: 300 });
    fixture.detectChanges();

    const toastService = TestBed.inject(ToastService);
    const toast = toastService.toasts()[0]!;
    expect(toast.message).toBe('otp has been send to mobile and email');
    toastService.dismiss(toast.id);
    const emailCodeInput = element.querySelector<HTMLInputElement>('#register-email-code');
    const mobileCodeInput = element.querySelector<HTMLInputElement>('#register-mobile-code');
    const completeButton =
      element.querySelector<HTMLButtonElement>('form button[type="submit"]');
    expect(element.querySelector('#register-name')).toBeNull();
    expect(element.textContent).not.toContain('Sending OTP');
    expect(element.querySelector('#edit-registration')).toBeNull();
    expect(emailCodeInput).not.toBeNull();
    expect(mobileCodeInput).not.toBeNull();
    expect(completeButton?.disabled).toBe(true);

    setInput(element, '#register-email-code', '123456');
    setInput(element, '#register-mobile-code', '654321');
    fixture.detectChanges();
    expect(completeButton?.disabled).toBe(false);
    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    const completeRequest = httpTesting.expectOne(
      '/api/customer/register/complete/',
    );
    expect(completeRequest.request.method).toBe('POST');
    expect(completeRequest.request.body).toEqual({
      verification_id: 'verification-123',
      email_code: '123456',
      mobile_code: '654321',
    });
    completeRequest.flush({
      message: 'Customer registered.',
      customer: {
        customer_id: 42,
        full_name: 'Asha Rao',
        email_id: 'asha@example.com',
        mobile_number: '+919876543210',
        dob: '1998-04-12',
        gender: 'female',
        account_status: 'active',
        created_at: '',
        updated_at: '',
      },
    });
    const successToast = toastService.toasts()[0]!;
    expect(successToast.message).toBe('Customer registered.');
    expect(successToast.type).toBe('success');
    toastService.dismiss(successToast.id);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('shows an error toast when registration completion fails', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    setInput(element, '#register-name', 'Asha Rao');
    setInput(element, '#register-dob', '1998-04-12');
    setSelect(element, '#register-gender', 'female');
    setInput(element, '#register-email', 'asha@example.com');
    setInput(element, '#register-mobile', '9876543210');
    setInput(element, '#register-password', 'secret');
    setInput(element, '#register-confirm-password', 'secret');
    fixture.detectChanges();
    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    httpTesting
      .expectOne('/api/customer/register/start/')
      .flush({ verification_id: 'verification-123', expires_in: 300 });
    fixture.detectChanges();

    setInput(element, '#register-email-code', '123456');
    setInput(element, '#register-mobile-code', '654321');
    fixture.detectChanges();
    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    httpTesting
      .expectOne('/api/customer/register/complete/')
      .flush(
        { message: 'The verification codes are invalid.' },
        { status: 400, statusText: 'Bad Request' },
      );

    const toastService = TestBed.inject(ToastService);
    const errorToast = toastService.toasts()[1]!;
    expect(errorToast.message).toBe('The verification codes are invalid.');
    expect(errorToast.type).toBe('error');
    toastService.dismiss(errorToast.id);
    toastService.dismiss(toastService.toasts()[0]!.id);
  });

  it('does not show an edit button during OTP verification', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    setInput(element, '#register-name', 'Asha Rao');
    setInput(element, '#register-dob', '1998-04-12');
    setSelect(element, '#register-gender', 'female');
    setInput(element, '#register-email', 'asha@example.com');
    setInput(element, '#register-mobile', '9876543210');
    setInput(element, '#register-password', 'secret');
    setInput(element, '#register-confirm-password', 'secret');
    fixture.detectChanges();
    element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    httpTesting
      .expectOne('/api/customer/register/start/')
      .flush({ verification_id: 'verification-123', expires_in: 300 });
    fixture.detectChanges();

    expect(element.querySelector('#register-email-code')).not.toBeNull();
    expect(element.querySelector('#edit-registration')).toBeNull();
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
