import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

const ORGANIZATION_TYPES = [
  {
    value: 'bank',
    label: 'Bank',
    documents: [
      'RBI Banking Licence',
      'Branch Authorization Letter',
      'Certificate of Incorporation',
    ],
  },
  {
    value: 'hospital',
    label: 'Hospital',
    documents: [
      'Hospital Registration Certificate',
      'Clinical Establishment Registration Certificate',
      'Hospital Operating Licence',
    ],
  },
  {
    value: 'rto',
    label: 'RTO',
    documents: ['Government Department Authorization Letter', 'Official Office Establishment Order'],
  },
  {
    value: 'ngo',
    label: 'NGO',
    documents: [
      'NGO Registration Certificate',
      'Trust Deed',
      'Society Registration Certificate',
      'Section 8 Incorporation Certificate',
    ],
  },
  {
    value: 'municipal_corporation',
    label: 'Municipal Corporation',
    documents: ['Municipal Authority Authorization Letter', 'Official Establishment Order'],
  },
  {
    value: 'district_collector_office',
    label: 'District Collector Office',
    documents: ['District Administration Authorization Letter', 'Government Office Order'],
  },
  {
    value: 'pension_office',
    label: 'Pension Office',
    documents: ['Pension Department Authorization Letter', 'Official Establishment Order'],
  },
  {
    value: 'passport_seva_kendra',
    label: 'Passport Seva Kendra',
    documents: ['Passport Office Authorization Letter', 'Government Establishment Order'],
  },
  {
    value: 'aadhaar_seva_kendra',
    label: 'Aadhaar Seva Kendra',
    documents: [
      'UIDAI Authorization Letter',
      'Aadhaar Enrolment Agency Authorization Certificate',
    ],
  },
  {
    value: 'post_office',
    label: 'Post Office',
    documents: ['Department of Posts Authorization Letter', 'Official Establishment Order'],
  },
  {
    value: 'electricity_board_office',
    label: 'Electricity Board / Office',
    documents: [
      'Electricity Distribution Licence',
      'Utility Authorization Letter',
      'Government Establishment Order',
    ],
  },
  {
    value: 'water_supply_office',
    label: 'Water Supply Office',
    documents: ['Water Supply Department Authorization Letter', 'Government Establishment Order'],
  },
  {
    value: 'gas_distribution_office',
    label: 'Gas Distribution Office',
    documents: [
      'Authorized Gas Distributorship Certificate',
      'Oil/Gas Company Authorization Letter',
    ],
  },
  {
    value: 'school',
    label: 'School',
    documents: [
      'School Recognition Certificate',
      'School Registration Certificate',
      'Affiliation Certificate',
    ],
  },
  {
    value: 'college_university',
    label: 'College / University',
    documents: [
      'University Establishment Act/Notification',
      'University Affiliation Letter',
      'Institution Recognition Certificate',
    ],
  },
  {
    value: 'police_station',
    label: 'Police Station',
    documents: ['Police Department Authorization Letter', 'Official Establishment Order'],
  },
  {
    value: 'court_legal_aid_centre',
    label: 'Court / Legal Aid Centre',
    documents: [
      'Legal Services Authority Authorization Letter',
      'Government Establishment Notification',
      'Official Court Administration Authorization',
    ],
  },
  {
    value: 'others',
    label: 'Others',
    documents: [
      'Relevant Government Registration Certificate',
      'Certificate of Incorporation',
      'Department Authorization Letter',
      'Applicable Operating Licence',
    ],
  },
] as const;

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.css',
})
export class AuthPage {
  readonly organizationTypes = ORGANIZATION_TYPES;
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly organization = true;

  get page(): string {
    return this.route.snapshot.data['page'] || 'login';
  }

  get title(): string {
    return (
      {
        login: 'Welcome back',
        register: 'Register your organization',
        verify: 'Check your inbox',
        forgot: 'Forgot your password?',
        reset: 'Choose a new password',
        approval: 'Your organization account',
        resubmit: 'Resubmit for review',
        account: 'You’re signed in',
        password: 'Change your password',
      } as Record<string, string>
    )[this.page];
  }

  get description(): string {
    return (
      {
        login: 'Sign in to continue making everyday life a little easier.',
        register:
          'Tell us about your organization. We’ll verify your email before submitting it for approval.',
        verify: 'Enter the six-digit email code. Your request expires after 10 minutes.',
        forgot: 'Enter your registered email to request a reset code.',
        reset: 'Enter your email code and choose your new password.',
        approval: 'Your approval status determines which features you can access.',
        resubmit:
          'Use the token from your review email to update your address and verification document.',
        account: 'Your organization account details.',
        password: 'Keep your account secure with a new password.',
      } as Record<string, string>
    )[this.page];
  }

  email = '';
  password = '';
  confirm = '';
  current = '';
  code = '';
  name = '';
  type = '';
  address = '';
  documentType = '';
  documentUrl = '';
  latitude: number | null = null;
  longitude: number | null = null;
  locationMessage = '';
  locating = false;
  token = '';
  error = '';
  message = '';
  busy = false;
  show = false;

  get documentTypes(): readonly string[] {
    return this.organizationTypes.find((organizationType) => organizationType.value === this.type)
      ?.documents ?? [];
  }

  onOrganizationTypeChange(type: string): void {
    this.type = type;
    this.documentType = '';
  }

  fetchCurrentLocation(): void {
    this.locationMessage = '';
    if (!navigator.geolocation) {
      this.locationMessage = 'Location is required, but this browser does not support location access.';
      return;
    }

    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.latitude = Number(coords.latitude.toFixed(6));
        this.longitude = Number(coords.longitude.toFixed(6));
        this.locationMessage = 'Current location captured.';
        this.locating = false;
      },
      (error) => {
        this.locationMessage =
          error.code === error.PERMISSION_DENIED
            ? 'Location is required. Allow location access in your browser and try again.'
            : 'Location is required. Check your device location settings and try again.';
        this.locating = false;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async submit(form: NgForm): Promise<void> {
    this.error = '';
    this.message = '';
    form.control.markAllAsTouched();
    if (form.invalid) {
      return;
    }
    if (this.page === 'register' && (this.latitude === null || this.longitude === null)) {
      this.locationMessage = 'Current location is required. Select “Use my current location” to continue.';
      return;
    }
    if (['register', 'reset', 'password'].includes(this.page) && this.password !== this.confirm) {
      this.error = 'Passwords must match.';
      return;
    }
    if (['verify', 'reset'].includes(this.page) && !/^\d{6}$/.test(this.code)) {
      this.error = 'Enter a six-digit code.';
      return;
    }

    this.busy = true;
    try {
      switch (this.page) {
        case 'login':
          await this.auth.login(this.email, this.password);
          await this.router.navigateByUrl(
            this.auth.session()?.approval_status === 'approved' ? '/dashboard' : '/approval',
          );
          break;
        case 'register':
          if (this.latitude === null || this.longitude === null) {
            this.locationMessage = 'Current location is required. Select “Use my current location” to continue.';
            return;
          }
          await this.auth.beginRegistration({
            organization_name: this.name,
            organization_type: this.type,
            email: this.email,
            password: this.password,
            confirm_password: this.confirm,
            address: this.address,
            document_type: this.documentType,
            document_url: this.documentUrl,
            latitude: this.latitude,
            longitude: this.longitude,
          });
          await this.router.navigateByUrl('/verify-email');
          break;
        case 'verify':
          await this.auth.completeRegistration(this.code);
          this.message =
            'Email verified. Your organization registration was submitted for approval. You can now sign in.';
          break;
        case 'forgot':
          await this.auth.beginReset(this.email);
          await this.router.navigateByUrl('/reset-password');
          break;
        case 'reset':
          await this.auth.completeReset(this.code, this.password, this.confirm);
          this.password = '';
          this.confirm = '';
          this.message = 'Password updated. Return to login to continue.';
          break;
        case 'resubmit':
          await this.auth.resubmit({
            resubmission_token: this.token,
            address: this.address,
            document_type: this.documentType,
            document_url: this.documentUrl,
          });
          this.message = 'Resubmitted for review. Your status is now pending.';
          break;
        case 'password':
          await this.auth.changePassword(this.current, this.password, this.confirm);
          this.password = '';
          this.confirm = '';
          this.current = '';
          this.message = 'Password changed. Please sign in again.';
          break;
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Please try again.';
    } finally {
      this.busy = false;
    }
  }

  async logout(): Promise<void> {
    this.error = '';
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/login');
    } catch (error) {
      this.message = `Your local session was cleared, but server sign out failed: ${
        error instanceof Error ? error.message : 'Please try again.'
      }`;
    }
  }
}
