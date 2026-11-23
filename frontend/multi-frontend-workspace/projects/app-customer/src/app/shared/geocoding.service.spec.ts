import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GeocodingAddress, GeocodingService, LatLng } from './geocoding.service';

const address: GeocodingAddress = {
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  country: 'India',
};

describe('GeocodingService', () => {
  let service: GeocodingService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GeocodingService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('returns coordinates for a matching city, state, pincode, and country', () => {
    let location: LatLng | null = null;
    service.geocode(address).subscribe((result) => (location = result));

    const request = httpTesting.expectOne(
      (request) =>
        request.url === 'https://nominatim.openstreetmap.org/search' &&
        request.params.get('q') === 'Mumbai, Maharashtra, 400001, India',
    );
    request.flush([{ lat: '19.076', lon: '72.8777' }]);

    expect(location).toEqual({ lat: 19.076, lng: 72.8777 });
  });

  it('returns no location when the location query has no match', () => {
    let location: LatLng | null = null;
    service.geocode(address).subscribe((result) => (location = result));

    httpTesting
      .expectOne(
        (request) =>
          request.url === 'https://nominatim.openstreetmap.org/search' &&
          request.params.get('q') === 'Mumbai, Maharashtra, 400001, India',
      )
      .flush([]);

    expect(location).toBeNull();
  });

  it('rejects coordinates outside valid latitude and longitude ranges', () => {
    let location: LatLng | null = null;
    service.geocode(address).subscribe((result) => (location = result));

    httpTesting
      .expectOne(
        (request) =>
          request.url === 'https://nominatim.openstreetmap.org/search' &&
          request.params.get('q') === 'Mumbai, Maharashtra, 400001, India',
      )
      .flush([{ lat: '91', lon: '200' }]);

    expect(location).toBeNull();
  });
});
