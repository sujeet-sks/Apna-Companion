import { HttpInterceptorFn } from '@angular/common/http';
import { API_BASE_URL } from '../api.config';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const backendRequest = request.url.startsWith('/')
    ? request.clone({ url: API_BASE_URL + request.url })
    : request;
  const accessToken =
    typeof sessionStorage === 'undefined'
      ? null
      : sessionStorage.getItem('access_token');

  const isPublicAuthRequest =
    backendRequest.url.includes('/api/admin/login/') ||
    backendRequest.url.includes('/api/admin/forgot-password/request/') ||
    backendRequest.url.includes('/auth/login') ||
    backendRequest.url.includes('/auth/sendOTP') ||
    backendRequest.url.includes('/auth/verifyOTP');

  if (!accessToken || isPublicAuthRequest) {
    return next(backendRequest);
  }

  const authenticatedRequest = backendRequest.clone({
    setHeaders: {
      Authorization: 'Bearer ' + accessToken,
    },
  });

  return next(authenticatedRequest);
};
