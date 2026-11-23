import { estimateCompanionCollection } from './companion-billing';

describe('estimateCompanionCollection', () => {
  it('rounds a partial hour up to the next hourly charge', () => {
    const estimate = estimateCompanionCollection(
      '350.00',
      60,
      '2026-11-23T09:00:00Z',
      '2026-11-23T10:10:00Z',
    );

    expect(estimate).toEqual({
      elapsedMinutes: 70,
      billableHours: 2,
      hourlyRateInPaise: 35000,
      amountInPaise: 70000,
    });
  });

  it('charges at least one hour for a shorter completed journey', () => {
    const estimate = estimateCompanionCollection(
      '350.00',
      60,
      '2026-11-23T09:00:00Z',
      '2026-11-23T09:20:00Z',
    );

    expect(estimate.billableHours).toBe(1);
    expect(estimate.amountInPaise).toBe(35000);
  });

  it('does not add an extra hour for an exact one-hour journey', () => {
    const estimate = estimateCompanionCollection(
      '350.00',
      60,
      '2026-11-23T09:00:00Z',
      '2026-11-23T10:00:00Z',
    );

    expect(estimate.billableHours).toBe(1);
    expect(estimate.amountInPaise).toBe(35000);
  });

  it('uses the booked duration when it is longer than actual service time', () => {
    const estimate = estimateCompanionCollection(
      '350.00',
      120,
      '2026-11-23T09:00:00Z',
      '2026-11-23T09:20:00Z',
    );

    expect(estimate.elapsedMinutes).toBe(20);
    expect(estimate.billableHours).toBe(2);
    expect(estimate.amountInPaise).toBe(70000);
  });

  it('rejects invalid prices and non-positive journey durations', () => {
    expect(() =>
      estimateCompanionCollection(
        'invalid',
        60,
        '2026-11-23T09:00:00Z',
        '2026-11-23T10:00:00Z',
      ),
    ).toThrow('The booking hourly price is invalid.');
    expect(() =>
      estimateCompanionCollection(
        '350.00',
        60,
        '2026-11-23T10:00:00Z',
        '2026-11-23T09:00:00Z',
      ),
    ).toThrow('The journey start or completion time is invalid.');
    expect(() =>
      estimateCompanionCollection(
        '350.00',
        0,
        '2026-11-23T09:00:00Z',
        '2026-11-23T10:00:00Z',
      ),
    ).toThrow('The booked duration is invalid.');
  });
});
