import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiBaseUrlInterceptor } from './api-base-url.interceptor';

describe('apiBaseUrlInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiBaseUrlInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('prefixes root-relative API paths with the customer backend URL', () => {
    http.get('/api/customer/login/').subscribe();

    const request = httpTesting.expectOne(
      'http://127.0.0.1:8000/api/customer/login/',
    );
    request.flush({});
  });

  it('leaves absolute URLs unchanged', () => {
    http.get('https://example.test/data').subscribe();

    const request = httpTesting.expectOne('https://example.test/data');
    request.flush({});
  });
});
