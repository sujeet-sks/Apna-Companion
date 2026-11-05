import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should show quick links to bookings and help', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Support for the moments');
    expect(element.querySelector('a[routerLink="/bookings"]')).toBeTruthy();
    expect(element.querySelector('a[routerLink="/help"]')).toBeTruthy();
  });
});
