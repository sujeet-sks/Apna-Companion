from decimal import Decimal
from contextlib import nullcontext
import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from django.test import RequestFactory
from django.db.models import Q

from .org_views import (
    _companion_input,
    _organization_coordinates,
    org_companions,
    org_profile,
    org_register_complete,
)


class CompanionInputTests(SimpleTestCase):
    def test_accepts_the_three_supported_gender_values(self):
        for gender in ("Male", "Female", "Prefer not to say"):
            with self.subTest(gender=gender):
                result = _companion_input({
                    "name": "Companion",
                    "email": "companion@example.com",
                    "mobile": "9876543210",
                    "service_ids": [1],
                    "gender": gender,
                })
                self.assertEqual(result["gender"], gender)

    def test_rejects_gender_values_outside_the_supported_options(self):
        with self.assertRaisesMessage(
            ValueError, "Gender must be Male, Female, or Prefer not to say."
        ):
            _companion_input({
                "name": "Companion",
                "email": "companion@example.com",
                "mobile": "9876543210",
                "service_ids": [1],
                "gender": "Other",
            })

    def test_gender_remains_optional(self):
        result = _companion_input({
            "name": "Companion",
            "email": "companion@example.com",
            "mobile": "9876543210",
            "service_ids": [1],
        })
        self.assertIsNone(result["gender"])


class OrganizationCompanionDirectoryTests(SimpleTestCase):
    @patch("portal.org_views._org")
    @patch("portal.org_views.Companion.objects.filter")
    def test_search_matches_companion_name_or_id(self, companion_filter, get_org):
        organization = SimpleNamespace(organization_id="org-1")
        companion = SimpleNamespace(
            companion_id="comp-123",
            name="Priya Sharma",
            is_active=True,
            availability_status="available",
        )
        queryset = MagicMock()
        queryset.order_by.return_value = queryset
        queryset.filter.return_value = queryset
        queryset.count.return_value = 1
        queryset.__getitem__.return_value = [companion]
        companion_filter.return_value = queryset
        get_org.return_value = (organization, None)

        request = RequestFactory().get(
            "/api/v1/org/companions/?search=Priya&page=1&page_size=10"
        )
        response = org_companions(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["items"][0]["companion_id"], "comp-123")
        queryset.filter.assert_called_once_with(
            Q(name__icontains="Priya") | Q(companion_id__icontains="Priya")
        )


class OrganizationCoordinatesTests(SimpleTestCase):
    def test_missing_coordinates_are_rejected(self):
        with self.assertRaisesMessage(ValueError, "Current location is required."):
            _organization_coordinates({})

    def test_valid_coordinates_are_rounded_to_database_precision(self):
        self.assertEqual(
            _organization_coordinates({"latitude": 37.7749295, "longitude": -122.4194155}),
            (Decimal("37.774930"), Decimal("-122.419416")),
        )

    def test_both_coordinates_are_required_when_one_is_provided(self):
        with self.assertRaisesMessage(ValueError, "Provide both latitude and longitude."):
            _organization_coordinates({"latitude": 37.5})

    def test_coordinates_must_be_within_geographic_ranges(self):
        with self.assertRaisesMessage(ValueError, "Latitude must be between"):
            _organization_coordinates({"latitude": 91, "longitude": 0})

        with self.assertRaisesMessage(ValueError, "Latitude must be between"):
            _organization_coordinates({"latitude": 0, "longitude": -181})

    @patch("portal.org_views.consume_email_code")
    @patch("portal.org_views.Organization.objects.create")
    @patch("portal.org_views.transaction.atomic", return_value=nullcontext())
    @patch("portal.org_views.verify_email_code")
    def test_registration_saves_coordinates(
        self, verify_code, _atomic, create_organization, _consume_code
    ):
        verify_code.return_value = (
            {
                "organization_id": "unused",
                "organization_name": "Example",
                "organization_type": "bank",
                "email": "org@example.com",
                "address": "Example address",
                "document_type": "RBI Banking Licence",
                "document_url": "https://drive.google.com/example",
                "password_hash": "hashed-password",
                "latitude": Decimal("37.774930"),
                "longitude": Decimal("-122.419416"),
            },
            None,
        )
        request = RequestFactory().post(
            "/api/v1/org/register/complete/",
            {"verification_id": "verification-id", "email_code": "123456"},
            content_type="application/json",
        )

        response = org_register_complete(request)

        self.assertEqual(response.status_code, 201)
        create_organization.assert_called_once()
        self.assertEqual(create_organization.call_args.kwargs["latitude"], Decimal("37.774930"))
        self.assertEqual(create_organization.call_args.kwargs["longitude"], Decimal("-122.419416"))


class OrganizationProfileTests(SimpleTestCase):
    @patch("portal.org_views._org")
    def test_patch_updates_address_logo_and_coordinates(self, get_org):
        organization = SimpleNamespace(
            address="Old address", logo_url=None, latitude=None, longitude=None,
            save=MagicMock(),
        )
        get_org.return_value = (organization, None)
        request = RequestFactory().patch(
            "/api/v1/org/profile/",
            data=json.dumps({
                "address": " New address ",
                "logo_url": " https://example.com/logo.png ",
                "latitude": 37.7749295,
                "longitude": -122.4194155,
            }),
            content_type="application/json",
        )

        response = org_profile(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"], {"message": "Profile updated"})
        self.assertEqual(organization.address, "New address")
        self.assertEqual(organization.logo_url, "https://example.com/logo.png")
        self.assertEqual(organization.latitude, Decimal("37.774930"))
        self.assertEqual(organization.longitude, Decimal("-122.419416"))
        self.assertTrue(get_org.call_args.kwargs["approved"])
        organization.save.assert_called_once_with(
            update_fields=["address", "logo_url", "latitude", "longitude", "updated_at"]
        )

    @patch("portal.org_views._org")
    def test_profile_get_does_not_return_document_url(self, get_org):
        organization = SimpleNamespace(
            organization_id="org-id", organization_name="Example",
            organization_type="bank", email="org@example.com", address="Mumbai",
            logo_url=None, latitude=None, longitude=None,
            document_type="RBI Banking Licence", document_url="private-url",
            approval_status="approved", approval_remarks=None, is_active=True,
        )
        get_org.return_value = (organization, None)
        request = RequestFactory().get("/api/v1/org/profile/")

        response = org_profile(request)

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("document_url", response.data["data"])

    @patch("portal.org_views._org")
    def test_patch_rejects_partial_coordinates(self, get_org):
        get_org.return_value = (SimpleNamespace(), None)
        request = RequestFactory().patch(
            "/api/v1/org/profile/",
            data=json.dumps({"latitude": 37.5}),
            content_type="application/json",
        )

        response = org_profile(request)

        self.assertEqual(response.status_code, 400)
