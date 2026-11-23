import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface GeocodingAddress {
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly url = 'https://nominatim.openstreetmap.org/search';

  private search(query: string): Observable<LatLng | null> {
    const params = new HttpParams()
      .set('q', query)
      .set('format', 'json')
      .set('limit', '1')
      .set('countrycodes', 'in');

    return this.http.get<NominatimResult[]>(this.url, { params }).pipe(
      map((results) => {
        const result = results[0];
        if (!result) return null;

        const lat = Number(result.lat);
        const lng = Number(result.lon);
        return Number.isFinite(lat) &&
          lat >= -90 &&
          lat <= 90 &&
          Number.isFinite(lng) &&
          lng >= -180 &&
          lng <= 180
          ? { lat, lng }
          : null;
      }),
    );
  }

  geocode(address: GeocodingAddress): Observable<LatLng | null> {
    const fullAddress = [
      address.city,
      address.state,
      address.pincode,
      address.country,
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');

    return this.search(fullAddress);
  }
}
