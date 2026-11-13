import { Routes } from '@angular/router';
import { AuthPage } from './features/auth/auth-page/auth-page';
import { authGuard } from './core/guards/auth.guard';
import { CompanionDashboard } from './features/companion/dashboard/dashboard';
import { CompanionProfile } from './features/companion/profile/profile';
export const routes:Routes=[
{path:'dashboard', component:CompanionDashboard, canActivate:[authGuard]},
{path:'dashboard-preview', component:CompanionDashboard, data:{preview:true}},
{path:'profile', component:CompanionProfile, canActivate:[authGuard]},
{path:'profile-preview', component:CompanionProfile, data:{preview:true}},
{path:'login', component:AuthPage, data:{page:'login'}},
{path:'forgot-password', component:AuthPage, data:{page:'forgot'}},
{path:'reset-password', component:AuthPage, data:{page:'reset'}},
{path:'account', component:AuthPage, data:{page:'account'}, canActivate:[authGuard]},
{path:'change-password', component:AuthPage, data:{page:'password'}, canActivate:[authGuard]},
{path:'',redirectTo:'login',pathMatch:'full'},
{path:'**',redirectTo:'login'}];
