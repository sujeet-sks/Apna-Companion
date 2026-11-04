import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const accessToken =
    typeof sessionStorage === 'undefined'
      ? null
      : sessionStorage.getItem('access_token');

  return accessToken ? true : router.createUrlTree(['/login']);
};
