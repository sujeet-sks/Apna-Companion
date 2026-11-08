import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ManageAddress } from './manage-address';

describe('ManageAddress', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAddress],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should render saved addresses', () => {
    const fixture = TestBed.createComponent(ManageAddress);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Add a new address');
    expect(element.textContent).toContain('SAVED (2)');
    expect(element.textContent).toContain('Shanti Apartments');
  });
});
