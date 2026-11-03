import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-register',
  styleUrls: ['../login-common.css', './register.css'],
  templateUrl: './register.html',
})
export class Register {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly latestDateOfBirth = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60_000,
  ).toISOString().slice(0, 10);

  readonly registrationForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.pattern(/\S/)]],
    dob: ['', Validators.required],
    gender: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
  });

  protected readonly otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  protected otpSent = false;
  protected otpVerified = false;
  protected otpMobile = '';
  protected isSendingOtp = false;
  protected isVerifyingOtp = false;
  protected isRegistering = false;
  protected registered = false;
  protected errorMessage = '';

  protected get canVerifyOtp(): boolean {
    return (
      this.otpSent &&
      this.otpForm.valid &&
      !this.isSendingOtp &&
      !this.isVerifyingOtp
    );
  }

  protected get canRegisterCustomer(): boolean {
    return (
      this.otpVerified &&
      this.registrationForm.valid &&
      !this.isRegistering &&
      !this.registered
    );
  }

  constructor() {
    this.registrationForm.controls.mobile.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((mobile) => {
        if (mobile.trim() !== this.otpMobile) {
          this.otpSent = false;
          this.otpVerified = false;
          this.otpMobile = '';
          this.otpForm.reset();
        }
      });
  }

  sendOtp(): void {
    if (
      this.registrationForm.invalid ||
      this.isSendingOtp ||
      this.isVerifyingOtp ||
      this.isRegistering ||
      this.registered
    ) {
      this.registrationForm.markAllAsTouched();
      setTimeout(() => {
        this.otpSent = true;
      }, 2000);
      return;
    }

    const localMobile = this.registrationForm.controls.mobile.value.trim();
    const mobile = `+91${localMobile}`;
    this.errorMessage = '';
    this.otpSent = false;
    this.otpVerified = false;
    this.otpForm.reset();
    this.isSendingOtp = true;
    this.http
      .post('/generateOTP', { mobile })
      .pipe(finalize(() => (this.isSendingOtp = false)))
      .subscribe({
        next: () => {
          if (this.registrationForm.controls.mobile.value.trim() !== localMobile) {
            this.errorMessage = 'The mobile number changed. Send a new OTP to continue.';
            return;
          }

          this.otpMobile = localMobile;
          this.otpSent = true;
        },
        error: () => (this.errorMessage = 'Unable to send an OTP. Please try again.'),
      });
  }

  protected verifyOtp(): void {
    if (!this.canVerifyOtp) {
      this.otpForm.markAllAsTouched();
      return;
    }

    const localMobile = this.otpMobile;
    const mobile = `+91${localMobile}`;
    this.errorMessage = '';
    this.isVerifyingOtp = true;
    this.http
      .post('/submitOTP', {
        mobile,
        otp: this.otpForm.controls.otp.value,
      })
      .pipe(finalize(() => (this.isVerifyingOtp = false)))
      .subscribe({
        next: () => {
          if (
            this.registrationForm.controls.mobile.value.trim() !== localMobile ||
            this.otpMobile !== localMobile
          ) {
            this.errorMessage = 'The mobile number changed. Send a new OTP to continue.';
            return;
          }
          this.otpVerified = true;
        },
        error: () =>
          (this.errorMessage = 'The OTP could not be verified. Check the code and try again.'),
      });
  }

  protected registerCustomer(): void {
    if (!this.canRegisterCustomer) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    const { fullName, dob, gender, email, mobile } = this.registrationForm.getRawValue();
    this.errorMessage = '';
    this.isRegistering = true;
    this.http
      .post('/registerCustomer', {
        fullName: fullName.trim(),
        dob,
        gender,
        email: email.trim(),
        mobile: `+91${mobile.trim()}`,
      })
      .pipe(finalize(() => (this.isRegistering = false)))
      .subscribe({
        next: () => (this.registered = true),
        error: () => (this.errorMessage = 'Unable to create your account. Please try again.'),
      });
  }
}
