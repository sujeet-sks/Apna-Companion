import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  CompanionJourneyHistory,
  CompanionService,
} from '../../../core/services/companion.service';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-companion-past-bookings',
  imports: [DatePipe, Sidebar],
  templateUrl: './past-bookings.html',
  styleUrl: './past-bookings.css',
})
export class CompanionPastBookings implements OnInit {
  private readonly companions = inject(CompanionService);
  readonly history = signal<CompanionJourneyHistory | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    void this.load(1);
  }

  async load(page: number): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.history.set(await this.companions.pastJourneys(page));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not load past journeys.');
    } finally {
      this.loading.set(false);
    }
  }
}
