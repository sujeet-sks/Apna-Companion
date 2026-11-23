import { HttpInterceptorFn } from '@angular/common/http';

export const CUSTOMER_API_BASE_URL = 'http://127.0.0.1:8000/';

export const apiBaseUrlInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/') || request.url.startsWith('//')) {
    return next(request);
  }

  return next(
    request.clone({
      url: `${CUSTOMER_API_BASE_URL}${request.url.slice(1)}`,
    }),
  );
};
