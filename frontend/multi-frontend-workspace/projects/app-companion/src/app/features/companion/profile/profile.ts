import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly companions = inject(CompanionService);
  profile: CompanionProfileData | null = null;
  loading = true;
  error = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.profile = await this.companions.profile();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not load the companion profile.';
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }
}
