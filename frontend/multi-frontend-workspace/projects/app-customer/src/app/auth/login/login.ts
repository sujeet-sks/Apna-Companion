import { Component } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

const emailOrMobileValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) {
    return null;
  }

  if (Validators.email(new FormControl(value)) === null) {
    return null;
  }

  const normalizedMobile = value.replace(/[\s()-]/g, '');
  return /^\+?[1-9]\d{9}$/.test(normalizedMobile)
    ? null
    : { emailOrMobile: true };
};

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  styleUrls: ['../login-common.css', './login.css'],
  templateUrl: './login.html',
})
export class Login {
  protected submitted = false;
  protected readonly loginForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, emailOrMobileValidator],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.loginForm.getRawValue();
    console.log('Login submitted:', { username, password });
    this.submitted = true;
  }
}
