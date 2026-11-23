import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(totalMinutes: number | null | undefined): string {
    if (totalMinutes === null || totalMinutes === undefined || !Number.isSafeInteger(totalMinutes) || totalMinutes < 0) {
      return '—';
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const minuteLabel = `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;

    if (hours === 0) return minuteLabel;

    const hourLabel = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return minutes === 0 ? hourLabel : `${hourLabel} ${minuteLabel}`;
  }
}
