import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
    },
    {
        path: '',
        loadComponent: () =>
            import('./landing-page/landing-page').then((component) => component.LandingPage),
        children: [
            {
                path: 'home',
                title: 'Home | Bharat Companion',
                loadComponent: () =>
                    import('./home/home').then((component) => component.Home),
            },
            {
                path: 'bookings',
                title: 'Bookings | Bharat Companion',
                loadComponent: () =>
                    import('./bookings/bookings').then((component) => component.Bookings),
            },
            {
                path: 'help',
                title: 'Help | Bharat Companion',
                loadComponent: () =>
                    import('./help/help').then((component) => component.Help),
            },
            {
                path: 'manage-address',
                title: 'Manage Address | Bharat Companion',
                loadComponent: () =>
                    import('./manage-address/manage-address').then(
                        (component) => component.ManageAddress,
                    ),
            },
            {
                path: 'profile',
                title: 'Your Profile | Bharat Companion',
                loadComponent: () =>
                    import('./user-profile/user-profile').then(
                        (component) => component.UserProfile,
                    ),
            },
        ],
    },
    {
        path: 'login',
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
