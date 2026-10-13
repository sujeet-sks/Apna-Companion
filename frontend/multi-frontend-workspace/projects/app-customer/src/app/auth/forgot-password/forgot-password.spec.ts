import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ForgotPassword } from './forgot-password';

describe('ForgotPassword', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render the password recovery form', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Forgot your password?');
    expect(element.querySelectorAll('input[required]')).toHaveLength(1);
    expect(element.querySelector('a[href="/login"]')?.textContent).toContain('Back to log in');
  });
});
