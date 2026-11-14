import { Routes } from '@angular/router';
import { AuthPage } from './features/auth/auth-page/auth-page';
import { OrganizationDashboard } from './features/organization/dashboard/dashboard';
import { OrganizationProfile } from './features/organization/profile/profile';
import { OrganizationCompanionForm } from './features/organization/companion-form/companion-form';
import { OrganizationCompanions } from './features/organization/companions/companions';
import { OrganizationServices } from './features/organization/services/services';
import { approvedOrganizationGuard, authGuard } from './core/guards/auth.guard';
export const routes:Routes=[
{path:'dashboard', component:OrganizationDashboard, canActivate:[approvedOrganizationGuard]},
{path:'dashboard-preview', component:OrganizationDashboard, data:{preview:true}},
{path:'profile', component:OrganizationProfile, canActivate:[approvedOrganizationGuard]},
{path:'profile-preview', component:OrganizationProfile, data:{preview:true}},
{path:'companions', component:OrganizationCompanions, canActivate:[approvedOrganizationGuard]},
{path:'companions-preview', component:OrganizationCompanions, data:{preview:true}},
{path:'companions/new', component:OrganizationCompanionForm, canActivate:[approvedOrganizationGuard]},
{path:'companions/new-preview', component:OrganizationCompanionForm, data:{preview:true}},
{path:'services', component:OrganizationServices, canActivate:[approvedOrganizationGuard]},
{path:'services-preview', component:OrganizationServices, data:{preview:true}},
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
