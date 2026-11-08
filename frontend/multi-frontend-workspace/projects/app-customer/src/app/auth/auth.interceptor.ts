import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const accessToken =
    typeof sessionStorage === 'undefined'
      ? null
      : sessionStorage.getItem('access_token');

  const isPublicAuthRequest =
    request.url.includes('/generateOTP') ||
    request.url.includes('/submitOTP') ||
    request.url.includes('/registerCustomer');

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
