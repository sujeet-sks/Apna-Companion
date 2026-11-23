import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '../../shared/toast.service';
import { ForgotPassword } from './forgot-password';

describe('ForgotPassword', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  function setInputValue(
    element: HTMLElement,
    selector: string,
    value: string,
  ): void {
    const input = element.querySelector<HTMLInputElement>(selector);
    if (!input) {
      throw new Error(`Input not found: ${selector}`);
    }

    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('requests a code, shows reset fields, and submits the reset request', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(
      Promise.resolve(true),
    );
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('input[required]')).toHaveLength(1);
    setInputValue(element, '#reset-identifier', 'person@example.com');
    fixture.detectChanges();
    element.querySelector('form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    const request = httpTesting.expectOne('/api/customer/forgot-password/request/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ identifier: 'person@example.com' });
    request.flush({
      message: 'A code was sent.',
      request_id: 'request-123',
      expires_in: 300,
    });
    const toastService = TestBed.inject(ToastService);
    const requestToast = toastService.toasts()[0]!;
    expect(requestToast.message).toBe('A code was sent.');
    expect(requestToast.type).toBe('success');
    toastService.dismiss(requestToast.id);
    fixture.detectChanges();

    expect(element.querySelector('#reset-code')).not.toBeNull();
    expect(element.querySelector('#new-password')).not.toBeNull();
    expect(element.querySelector('#confirm-password')).not.toBeNull();
    setInputValue(element, '#reset-code', '123456');
    setInputValue(element, '#new-password', 'new-secret');
    setInputValue(element, '#confirm-password', 'new-secret');
    fixture.detectChanges();
    element.querySelector('form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const confirmation = httpTesting.expectOne(
      '/api/customer/forgot-password/confirm/',
    );
    expect(confirmation.request.method).toBe('POST');
    expect(confirmation.request.body).toEqual({
      request_id: 'request-123',
      code: '123456',
      new_password: 'new-secret',
      confirm_password: 'new-secret',
    });
    confirmation.flush({ message: 'Password updated.' });
    const confirmationToast = toastService.toasts()[0]!;
    expect(confirmationToast.message).toBe('Password updated.');
    expect(confirmationToast.type).toBe('success');
    toastService.dismiss(confirmationToast.id);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('shows an error toast when the code request fails', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    setInputValue(element, '#reset-identifier', 'person@example.com');
    fixture.detectChanges();
    element.querySelector('form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    httpTesting
      .expectOne('/api/customer/forgot-password/request/')
      .flush(
        { message: 'Unable to send a code.' },
        { status: 400, statusText: 'Bad Request' },
      );

    const toastService = TestBed.inject(ToastService);
    const toast = toastService.toasts()[0]!;
    expect(toast.message).toBe('Unable to send a code.');
    expect(toast.type).toBe('error');
    toastService.dismiss(toast.id);
  });

  it('shows an error toast when password confirmation fails', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    setInputValue(element, '#reset-identifier', 'person@example.com');
    fixture.detectChanges();
    element.querySelector('form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    httpTesting
      .expectOne('/api/customer/forgot-password/request/')
      .flush({
        message: 'A code was sent.',
        request_id: 'request-789',
        expires_in: 300,
      });
    const toastService = TestBed.inject(ToastService);
    toastService.dismiss(toastService.toasts()[0]!.id);
    fixture.detectChanges();

    setInputValue(element, '#reset-code', '123456');
    setInputValue(element, '#new-password', 'new-secret');
    setInputValue(element, '#confirm-password', 'new-secret');
    fixture.detectChanges();
    element.querySelector('form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    httpTesting
      .expectOne('/api/customer/forgot-password/confirm/')
      .flush(
        { message: 'The verification code is invalid.' },
        { status: 400, statusText: 'Bad Request' },
      );

    const toast = toastService.toasts()[0]!;
    expect(toast.message).toBe('The verification code is invalid.');
    expect(toast.type).toBe('error');
    toastService.dismiss(toast.id);
  });

  it('accepts a mobile number as the recovery identifier', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    setInputValue(element, '#reset-identifier', '9876543210');
    fixture.detectChanges();
    element.querySelector('form')?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    const request = httpTesting.expectOne('/api/customer/forgot-password/request/');
    expect(request.request.body).toEqual({ identifier: '9876543210' });
    request.flush({
      message: 'A code was sent.',
      request_id: 'request-456',
      expires_in: 300,
    });
    const toastService = TestBed.inject(ToastService);
    toastService.dismiss(toastService.toasts()[0]!.id);
    fixture.detectChanges();

    expect(element.querySelector('#reset-code')).not.toBeNull();
    expect(element.querySelector('a[href="/login"]')?.textContent).toContain('Back to log in');
  });
});
