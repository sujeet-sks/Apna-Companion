import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
    },
    {
        path: 'login',
        title: 'Bharat Companion',
        loadComponent: () =>
            import('./auth/login/login').then((component) => component.Login),
    },
    {
        path: 'register',
        loadComponent: () =>
            import('./auth/register/register').then((component) => component.Register),
    },
    {
        path: 'forgot-password',
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
