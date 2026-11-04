import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const accessToken =
    typeof sessionStorage === 'undefined'
      ? null
      : sessionStorage.getItem('access_token');

  const isPublicAuthRequest =
    request.url.includes('/auth/login') ||
    request.url.includes('/auth/sendOTP') ||
    request.url.includes('/auth/verifyOTP');

  if (!accessToken || isPublicAuthRequest) {
    return next(request);
  }

  const authenticatedRequest = request.clone({
    setHeaders: {
      Authorization: 'Bearer ' + accessToken,
    },
  });

  return next(authenticatedRequest);
};
