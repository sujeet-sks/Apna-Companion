import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Bookings } from './bookings';

describe('Bookings', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bookings],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should show the empty bookings state', () => {
    const fixture = TestBed.createComponent(Bookings);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Your bookings will appear here',
    );
  });
});
