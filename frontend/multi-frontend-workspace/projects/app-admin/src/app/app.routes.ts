import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    title: 'Admin Login | Bharat Companion',
    loadComponent: () =>
      import('./auth/login/login').then((component) => component.Login),
  },
  {
    path: 'forgot-password',
    title: 'Forgot Password | Bharat Companion',
    loadComponent: () =>
      import('./auth/forgot-password/forgot-password').then(
        (component) => component.ForgotPassword,
      ),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
