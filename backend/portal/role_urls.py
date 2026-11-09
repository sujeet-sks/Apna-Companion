from django.urls import path

from . import companion_views as c, org_booking_views as b, org_views as o


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
    path("org/services/<int:service_id>/", o.org_service_detail),
    path("org/services/<int:service_id>/status/", o.org_service_status),
    path("org/companions/", o.org_companions),
    path("org/companions/<str:companion_id>/", o.org_companion_detail),
    path("org/companions/<str:companion_id>/status/", o.org_companion_status),
    path("org/companions/<str:companion_id>/services/", o.org_companion_services),
    path("org/bookings/", b.org_bookings),
    path("org/bookings/<int:booking_id>/", b.org_booking_detail),
    path("org/bookings/<int:booking_id>/accept/", b.org_booking_accept),
    path("org/bookings/<int:booking_id>/reject/", b.org_booking_reject),
    path("org/bookings/<int:booking_id>/eligible-companions/", b.org_booking_eligible_companions),
    path("org/bookings/<int:booking_id>/assign/", b.org_booking_assign),
    path("org/bookings/<int:booking_id>/tracking/", b.org_booking_tracking),
    path("org/bookings/<int:booking_id>/cancel/", b.org_booking_cancel),

    path("companion/login/", c.companion_login),
    path("companion/forgot-password/request/", c.companion_forgot_request),
    path("companion/forgot-password/complete/", c.companion_forgot_complete),
    path("companion/me/", c.companion_me),
    path("companion/change-password/", c.companion_change_password),
    path("companion/logout/", c.companion_logout),
]