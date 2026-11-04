import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

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
    path: 'admin',
    // canActivate: [authGuard],
    loadComponent: () =>
      import('./admin/admin-layout/admin-layout').then(
        (component) => component.AdminLayout,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        title: 'Dashboard | Bharat Companion',
        loadComponent: () =>
          import('./admin/dashboard/dashboard').then(
            (component) => component.Dashboard,
          ),
      },
      {
        path: 'pending-requests',
        title: 'Pending Requests | Bharat Companion',
        loadComponent: () =>
          import('./admin/pending-requests/pending-requests').then(
            (component) => component.PendingRequests,
          ),
      },
      {
        path: 'clients',
        title: 'Clients | Bharat Companion',
        loadComponent: () =>
          import('./admin/clients/clients').then(
            (component) => component.Clients,
          ),
      },
      {
        path: 'settings',
        title: 'Settings | Bharat Companion',
        loadComponent: () =>
          import('./admin/settings/settings').then(
            (component) => component.Settings,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
