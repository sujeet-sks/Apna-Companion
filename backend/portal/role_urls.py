from django.urls import path

from . import companion_views as c, org_views as o


urlpatterns = [
    path("org/register/start/", o.org_register_start),
    path("org/register/complete/", o.org_register_complete),
    path("org/register/resubmit/", o.org_resubmit),
    path("org/login/", o.org_login),
    path("org/forgot-password/request/", o.org_forgot_request),
    path("org/forgot-password/complete/", o.org_forgot_complete),
    path("org/me/", o.org_me),
    path("org/profile/", o.org_profile),
    path("org/change-password/", o.org_change_password),
    path("org/logout/", o.org_logout),
    path("org/services/", o.org_services),
    path("org/companions/", o.org_companions),

    path("companion/login/", c.companion_login),
    path("companion/forgot-password/request/", c.companion_forgot_request),
    path("companion/forgot-password/complete/", c.companion_forgot_complete),
    path("companion/me/", c.companion_me),
    path("companion/change-password/", c.companion_change_password),
    path("companion/logout/", c.companion_logout),
]