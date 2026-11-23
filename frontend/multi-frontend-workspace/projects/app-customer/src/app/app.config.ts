import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { apiBaseUrlInterceptor } from './api-base-url.interceptor';
import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { loadingInterceptor } from './loading/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([
        apiBaseUrlInterceptor,
        authInterceptor,
        loadingInterceptor,
      ]),
    ),
    provideRouter(routes),
  ],
};
