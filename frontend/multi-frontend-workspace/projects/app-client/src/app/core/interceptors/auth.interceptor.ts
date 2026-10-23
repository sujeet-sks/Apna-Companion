import { HttpInterceptorFn } from '@angular/common/http';

// TODO: Attach credentials once the authentication contract is defined.
export const authInterceptor: HttpInterceptorFn = (request, next) => next(request);
