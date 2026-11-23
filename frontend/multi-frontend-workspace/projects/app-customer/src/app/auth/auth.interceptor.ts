import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const accessToken =
    typeof sessionStorage === 'undefined'
      ? null
      : sessionStorage.getItem('access_token');

  const isPublicAuthRequest =
    request.url.includes('/api/customer/register/start/') ||
    request.url.includes('/api/customer/register/complete/') ||
    request.url.includes('/api/customer/login/') ||
    request.url.includes('/api/customer/forgot-password/request/') ||
    request.url.includes('/api/customer/forgot-password/confirm/') ||
    request.url.includes('https://nominatim.openstreetmap.org/');

  if (!accessToken || isPublicAuthRequest) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );
};
