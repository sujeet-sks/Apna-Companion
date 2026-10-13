import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Register } from './register';

describe('Register', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render the registration form', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Create your account');
    expect(element.querySelectorAll('input[required]')).toHaveLength(3);
    expect(element.querySelector('a[href="/login"]')?.textContent).toContain('Log in');
  });
});
