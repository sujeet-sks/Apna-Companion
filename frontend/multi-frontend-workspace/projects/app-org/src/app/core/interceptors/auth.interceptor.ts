import { HttpInterceptorFn } from '@angular/common/http';
import { AUTH_TOKEN_STORAGE_KEY } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!token || !request.url.startsWith('http://localhost:8000/api/v1/')) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
