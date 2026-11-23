import { Routes } from '@angular/router';
import { AuthPage } from './features/auth/auth-page/auth-page';
import { OrganizationDashboard } from './features/organization/dashboard/dashboard';
import { OrganizationOverview } from './features/organization/overview/overview';
import { OrganizationProfile } from './features/organization/profile/profile';
import { OrganizationCompanionForm } from './features/organization/companion-form/companion-form';
import { OrganizationCompanions } from './features/organization/companions/companions';
import { OrganizationServices } from './features/organization/services/services';
import { approvedOrganizationGuard, authGuard } from './core/guards/auth.guard';
export const routes:Routes=[
{path:'dashboard', component:OrganizationOverview, canActivate:[approvedOrganizationGuard]},
{path:'bookings', component:OrganizationDashboard, canActivate:[approvedOrganizationGuard]},
{path:'profile', component:OrganizationProfile, canActivate:[approvedOrganizationGuard]},
{path:'companions', component:OrganizationCompanions, canActivate:[approvedOrganizationGuard]},
{path:'companions/new', component:OrganizationCompanionForm, canActivate:[approvedOrganizationGuard]},
{path:'services', component:OrganizationServices, canActivate:[approvedOrganizationGuard]},
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
