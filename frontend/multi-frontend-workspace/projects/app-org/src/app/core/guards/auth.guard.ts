import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
export const authGuard:CanActivateFn=()=>inject(AuthService).signedIn || inject(Router).createUrlTree(['/login']);
export const approvedOrganizationGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.signedIn) {
    return router.createUrlTree(['/login']);
  }
  return auth.session()?.approval_status === 'approved'
    ? true
    : router.createUrlTree(['/approval']);
};
