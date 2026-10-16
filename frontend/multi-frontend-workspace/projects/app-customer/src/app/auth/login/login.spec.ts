import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Login } from './login';

describe('Login', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([])],
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
});
