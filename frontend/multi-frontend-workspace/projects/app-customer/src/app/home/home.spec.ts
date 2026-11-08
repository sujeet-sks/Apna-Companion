import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('should show booking modes and quick links', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Need a companion');
    expect(element.textContent).toContain('Formal booking');
    expect(element.textContent).toContain('Everyday outing');
    expect(element.textContent).toContain('Hospitals');
    expect(element.querySelector('a[routerLink="/bookings"]')).toBeTruthy();
    expect(element.querySelector('a[routerLink="/help"]')).toBeTruthy();
  });
});
