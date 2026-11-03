import { TestBed } from '@angular/core/testing';
import { UserProfile } from './user-profile';

describe('UserProfile', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserProfile],
    }).compileComponents();
  });

  it('should show customer profile details', () => {
    const fixture = TestBed.createComponent(UserProfile);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Your profile');
    expect(element.querySelector('#profile-name')?.textContent).toContain('Rahul');
    expect(element.textContent).toContain('Andheri West, Mumbai');
  });
});
