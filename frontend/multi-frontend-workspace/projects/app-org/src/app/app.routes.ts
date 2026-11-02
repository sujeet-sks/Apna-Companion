import { Routes } from '@angular/router';
import { AuthPage } from './features/auth/auth-page/auth-page';
import { authGuard } from './core/guards/auth.guard';
export const routes:Routes=[
{path:'login', component:AuthPage, data:{page:'login'}},
{path:'forgot-password', component:AuthPage, data:{page:'forgot'}},
{path:'reset-password', component:AuthPage, data:{page:'reset'}},
{path:'account', component:AuthPage, data:{page:'account'}, canActivate:[authGuard]},
{path:'change-password', component:AuthPage, data:{page:'password'}, canActivate:[authGuard]},
{path:'register', component:AuthPage, data:{page:'register'}},
{path:'verify-email', component:AuthPage, data:{page:'verify'}},
{path:'approval', component:AuthPage, data:{page:'approval'}, canActivate:[authGuard]},
{path:'resubmit', component:AuthPage, data:{page:'resubmit'}},
{path:'',redirectTo:'login',pathMatch:'full'},
{path:'**',redirectTo:'login'}];
