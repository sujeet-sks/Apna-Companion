from django.urls import path
from . import admin_views

from .customer_views import (
    forgot_password_confirm, forgot_password_request,
    login, logout, me, register_complete, register_start,
)
from .views import health


urlpatterns = [
    path("health/", health, name="health"),
    path("customer/register/start/", register_start),
    path("customer/register/complete/", register_complete),
    path("customer/login/", login),
    path("customer/forgot-password/request/", forgot_password_request),
    path("customer/forgot-password/confirm/", forgot_password_confirm),
    path("customer/me/", me),
    path("customer/logout/", logout),
    path("admin/login/", admin_views.login),
    path("admin/forgot-password/request/", admin_views.forgot_password_request),
    path("admin/forgot-password/confirm/", admin_views.forgot_password_confirm),
    path("admin/logout/", admin_views.logout),
]
