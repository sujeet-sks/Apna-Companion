import { TestBed } from '@angular/core/testing';
import { ManageAddress } from './manage-address';

describe('ManageAddress', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAddress],
    }).compileComponents();
  });

  it('should render the manage address page', () => {
    const fixture = TestBed.createComponent(ManageAddress);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Manage Address');
    expect(element.textContent).toContain('Your saved addresses will appear here');
  });
});
