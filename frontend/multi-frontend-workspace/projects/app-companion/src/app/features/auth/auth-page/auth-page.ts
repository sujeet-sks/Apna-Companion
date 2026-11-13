import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.css',
})
export class AuthPage {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly organization = false;

  get page(): string {
    return this.route.snapshot.data['page'] || 'login';
  }

  get title(): string {
    return (
      {
        login: 'Welcome back',
        forgot: 'Forgot your password?',
        reset: 'Choose a new password',
        account: 'You’re signed in',
        password: 'Change your password',
      } as Record<string, string>
    )[this.page];
  }

  get description(): string {
    return (
      {
        login: 'Sign in to continue making everyday life a little easier.',
        forgot: 'Enter your registered email to request a reset code.',
        reset: 'Enter your email code and choose your new password.',
        account: 'Your companion account details.',
        password: 'Keep your account secure with a new password.',
      } as Record<string, string>
    )[this.page];
  }

  email = '';
  password = '';
  confirm = '';
  current = '';
  code = '';
  error = '';
  message = '';
  busy = false;
  show = false;

  async submit(form: NgForm): Promise<void> {
    this.error = '';
    this.message = '';
    form.control.markAllAsTouched();
    if (form.invalid) {
      return;
    }
    if (['reset', 'password'].includes(this.page) && this.password !== this.confirm) {
      this.error = 'Passwords must match.';
      return;
    }
    if (this.page === 'reset' && !/^\d{6}$/.test(this.code)) {
      this.error = 'Enter a six-digit code.';
      return;
    }

    this.busy = true;
    try {
      switch (this.page) {
        case 'login':
          await this.auth.login(this.email, this.password);
          await this.router.navigateByUrl('/dashboard');
          break;
        case 'forgot':
          await this.auth.beginReset(this.email);
          await this.router.navigateByUrl('/reset-password');
          break;
        case 'reset':
          await this.auth.completeReset(this.code, this.password, this.confirm);
          this.password = '';
          this.confirm = '';
          this.message = 'Password updated. Return to login to continue.';
          break;
        case 'password':
          await this.auth.changePassword(this.current, this.password, this.confirm);
          this.password = '';
          this.confirm = '';
          this.current = '';
          this.message = 'Password changed. Please sign in again.';
          break;
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Please try again.';
    } finally {
      this.busy = false;
    }
  }

  async logout(): Promise<void> {
    this.error = '';
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/login');
    } catch (error) {
      this.message = `Your local session was cleared, but server sign out failed: ${
        error instanceof Error ? error.message : 'Please try again.'
      }`;
    }
  }
}
