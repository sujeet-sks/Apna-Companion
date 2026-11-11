from django.db import models
from django.contrib.postgres.fields import ArrayField

class Customer(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    customer_id = models.BigAutoField(primary_key=True)
    mobile_number = models.CharField(max_length=16, unique=True)
    email_id = models.EmailField(max_length=254, unique=True)
    password_hash = models.CharField(max_length=255)
    full_name = models.CharField(max_length=100)
    dob = models.DateField()
    gender = models.CharField(max_length=30)
    account_status = models.CharField(
        max_length=8, choices=Status.choices, default=Status.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "customers"


class Organization(models.Model):
    organization_id = models.CharField(max_length=36, primary_key=True)
    organization_name = models.CharField(max_length=150)
    organization_type = models.CharField(max_length=50)
    email = models.EmailField(max_length=255)
    address = models.TextField()
    approval_status = models.CharField(max_length=20, default="pending")
    approval_remarks = models.TextField(null=True, blank=True)
    logo_url = models.TextField(null=True, blank=True)
    document_type = models.TextField()
    document_url = models.TextField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    password_hash = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "organizations"


class Service(models.Model):
    id = models.BigAutoField(primary_key=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, db_column="organization_id")
    name = models.CharField(max_length=120)
    description = models.TextField(null=True, blank=True)
    price_inr = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "services"


class Companion(models.Model):
    companion_id = models.CharField(max_length=36, primary_key=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, db_column="organization_id")
    name = models.CharField(max_length=100)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(max_length=255)
    mobile = models.CharField(max_length=15)
    address = models.TextField(null=True, blank=True)
    identity_proof_url = models.TextField(null=True, blank=True)
    photo_url = models.TextField(null=True, blank=True)
    speciality = models.CharField(max_length=100, null=True, blank=True)
    experience_years = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    languages_known = ArrayField(models.TextField(), default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    availability_status = models.CharField(max_length=20, default="available")
    password_hash = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "companions"


class CompanionService(models.Model):
    id = models.BigAutoField(primary_key=True)
    companion = models.ForeignKey(Companion, on_delete=models.PROTECT, db_column="companion_id")
    service = models.ForeignKey(Service, on_delete=models.PROTECT, db_column="service_id")

    class Meta:
        managed = False
        db_table = "companion_services"


class Booking(models.Model):
    id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey("portal.Customer", on_delete=models.PROTECT, db_column="customer_id")
    companion = models.ForeignKey(Companion, on_delete=models.PROTECT, db_column="companion_id", null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.PROTECT, db_column="service_id")
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, db_column="organization_id")
    rejection_reason = models.TextField(null=True, blank=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    service_notes = models.TextField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    scheduled_at = models.DateTimeField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    pickup_address = models.TextField(null=True, blank=True)
    duration = models.IntegerField()
    status = models.CharField(max_length=20, default="pending")
    start_code_hash = models.CharField(max_length=255, null=True, blank=True)
    end_code_hash = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    price_inr = models.DecimalField(max_digits=10, decimal_places=2)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.CharField(max_length=20, null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bookings"