export interface CompanionCollectionEstimate {
  elapsedMinutes: number;
  billableHours: number;
  hourlyRateInPaise: number;
  amountInPaise: number;
}

export function estimateCompanionCollection(
  hourlyPriceInr: string,
  bookingDurationMinutes: number,
  startedAt: string,
  completedAt: string,
): CompanionCollectionEstimate {
  const hourlyPrice = Number(hourlyPriceInr);
  const startTime = Date.parse(startedAt);
  const endTime = Date.parse(completedAt);

  if (!Number.isFinite(hourlyPrice) || hourlyPrice < 0) {
    throw new Error('The booking hourly price is invalid.');
  }
  if (!Number.isSafeInteger(bookingDurationMinutes) || bookingDurationMinutes <= 0) {
    throw new Error('The booked duration is invalid.');
  }
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    throw new Error('The journey start or completion time is invalid.');
  }

  const elapsedMilliseconds = endTime - startTime;
  const elapsedMinutes = Math.ceil(elapsedMilliseconds / 60_000);
  const hourlyRateInPaise = Math.round(hourlyPrice * 100);
  const billableHours = Math.max(
    1,
    Math.ceil(Math.max(bookingDurationMinutes, elapsedMinutes) / 60),
  );

  return {
    elapsedMinutes,
    billableHours,
    hourlyRateInPaise,
    amountInPaise: hourlyRateInPaise * billableHours,
  };
}
