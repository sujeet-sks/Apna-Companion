import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CompanionProfile as CompanionProfileData, CompanionService } from '../../../core/services/companion.service';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-companion-profile',
  standalone: true,
  imports: [RouterLink, Sidebar],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css', '../../../shared/companion-page-layout.css'],
})
export class CompanionProfile implements OnInit {
  private readonly companions = inject(CompanionService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  isPreview = this.route.snapshot.data['preview'] === true;
  profile: CompanionProfileData | null = null;
  loading = true;
  error = '';

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.isPreview = data['preview'] === true;
      void this.load();
    });
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    if (this.isPreview) {
      this.profile = {
        companion_id: 'demo-1',
        name: 'Riya Patel',
        email: 'riya.patel@example.test',
        mobile: '+91 98765 43210',
        dob: '1997-04-12',
        gender: 'Female',
        address: 'Powai, Mumbai, Maharashtra',
        photo_url: null,
        speciality: 'Hospital visits',
        experience_years: 4,
        languages_known: ['Hindi', 'English', 'Marathi'],
        is_active: true,
        availability_status: 'available',
        organization: {
          organization_id: 'demo-org',
          organization_name: 'Sunrise Community Care',
          email: 'hello@sunrise.example',
          address: '24 Lake View Road, Powai, Mumbai, Maharashtra',
          logo_url: null,
        },
      };
      this.loading = false;
      return;
    }

    try {
      this.profile = await this.companions.profile();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not load the companion profile.';
    } finally {
      this.loading = false;
    }
  }
}
