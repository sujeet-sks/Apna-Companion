import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrganizationService } from '../../../core/services/organization.service';
import { OrganizationProfile } from './profile';

describe('OrganizationProfile', () => {
  it('averages ratings from completed bookings only', async () => {
    const organizations = {
      allBookings: () => Promise.resolve([
        { status: 'completed', organization_rating: 4 },
        { status: 'completed', organization_rating: 5 },
        { status: 'pending', organization_rating: 1 },
        { status: 'completed', organization_rating: null },
      ]),
    };
    TestBed.configureTestingModule({
      imports: [OrganizationProfile],
      providers: [
        provideRouter([]),
        { provide: OrganizationService, useValue: organizations },
      ],
    });

    const fixture = TestBed.createComponent(OrganizationProfile);
    await fixture.componentInstance.loadRatings();

    expect(fixture.componentInstance.organizationRatingAverage).toBe('4.5');
    expect(fixture.componentInstance.organizationRatingCount).toBe(2);
    fixture.destroy();
  });
});
