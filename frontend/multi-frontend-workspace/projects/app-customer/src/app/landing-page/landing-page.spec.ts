import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render the customer dashboard header', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector<HTMLImageElement>('.dashboard-header img')?.getAttribute('src'))
      .toBe('/assets/bharat-companion-logo.svg');
    expect(element.querySelectorAll('.main-nav .nav-link')).toHaveLength(3);
    expect(element.querySelector('.main-nav a[routerLink="/home"]')).toBeTruthy();
    expect(element.querySelector('.main-nav a[routerLink="/bookings"]')).toBeTruthy();
    expect(element.querySelector('.main-nav a[routerLink="/help"]')).toBeTruthy();
    expect(element.querySelector('router-outlet')).toBeTruthy();
    expect(element.querySelector('.site-footer')?.textContent).toContain('2026 Bharat Companion');
    expect(element.querySelector('main')).toBeNull();
  });
});
