import { TestBed } from '@angular/core/testing';
import { UserProfile } from './user-profile';

describe('UserProfile', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserProfile],
    }).compileComponents();
    sessionStorage.setItem('customer_id', '42');
    sessionStorage.setItem('full_name', 'Test Customer');
    sessionStorage.setItem('email_id', 'person@example.com');
    sessionStorage.setItem('mobile_number', '9876543210');
  });

  afterEach(() => {
    sessionStorage.removeItem('customer_id');
    sessionStorage.removeItem('full_name');
    sessionStorage.removeItem('email_id');
    sessionStorage.removeItem('mobile_number');
  });

  it('shows customer profile details from session storage', () => {
    const fixture = TestBed.createComponent(UserProfile);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Your profile');
    expect(element.querySelector('#profile-name')?.textContent).toContain('Test Customer');
    expect(element.textContent).toContain('42');
    expect(element.textContent).toContain('person@example.com');
    expect(element.textContent).toContain('9876543210');
  });
});
