import { CanActivateFn } from '@angular/router';

// Scaffold only: denies access until real authentication is implemented.
// Register on protected routes after connecting AuthService.
export const authGuard: CanActivateFn = () => false;
