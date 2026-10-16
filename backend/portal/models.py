from django.db import models
from django.utils import timezone


class Category(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=80, unique=True)

    class Meta:
        managed = False
        db_table = "categories"


class Organization(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=150)
    address = models.TextField()
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    status = models.CharField(max_length=16, default="pending")

    class Meta:
        managed = False
        db_table = "organizations"


class Service(models.Model):
    id = models.BigAutoField(primary_key=True)
    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT
    )
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    name = models.CharField(max_length=120)
    price_inr = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "services"


class VerificationCode(models.Model):
    id = models.BigAutoField(primary_key=True)
    role = models.CharField(max_length=20)
    identifier = models.CharField(max_length=254)
    purpose = models.CharField(max_length=20)
    code_hash = models.CharField(max_length=255)
    expires_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "verification_codes"


class PortalUser(models.Model):
    id = models.BigAutoField(primary_key=True)
    role = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    login_identifier = models.CharField(max_length=254)
    password_hash = models.CharField(
        max_length=255, null=True, blank=True
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT,
        null=True, blank=True
    )
    status = models.CharField(max_length=12, default="active")

    class Meta:
        managed = False
        db_table = "users"
        unique_together = [("role", "login_identifier")]


class LoginToken(models.Model):
    token_hash = models.CharField(max_length=64, primary_key=True)
    user = models.OneToOneField(
        PortalUser, on_delete=models.PROTECT
    )
    expires_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "login_tokens"


class Booking(models.Model):
    id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(
        PortalUser, on_delete=models.PROTECT,
        related_name="customer_bookings"
    )
    service = models.ForeignKey(
        Service, on_delete=models.PROTECT
    )
    companion = models.ForeignKey(
        PortalUser, on_delete=models.PROTECT,
        null=True, blank=True,
        related_name="companion_bookings"
    )
    scheduled_at = models.DateTimeField()
    pickup_address = models.TextField()
    pickup_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    pickup_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    status = models.CharField(max_length=16, default="pending")
    quoted_amount_inr = models.DecimalField(
        max_digits=10, decimal_places=2
    )
    start_code_hash = models.CharField(
        max_length=255, null=True, blank=True
    )
    end_code_hash = models.CharField(
        max_length=255, null=True, blank=True
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = "bookings"


class Payment(models.Model):
    booking = models.OneToOneField(
        Booking, on_delete=models.PROTECT, primary_key=True
    )
    status = models.CharField(max_length=12, default="pending")
    gateway_order_id = models.CharField(
        max_length=120, unique=True, null=True, blank=True
    )
    gateway_payment_id = models.CharField(
        max_length=120, unique=True, null=True, blank=True
    )

    class Meta:
        managed = False
        db_table = "payments"


class Rating(models.Model):
    booking = models.OneToOneField(
        Booking, on_delete=models.PROTECT, primary_key=True
    )
    score = models.SmallIntegerField()
    comment = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "ratings"