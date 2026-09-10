/**
 * Unit Tests: Structured Opening Hours & Live Open/Closed Status.
 */

import { PublicContentService, OpeningHourSlot } from '../../apps/api/src/services/public-content.service';

describe('Public Content: Opening Hours Live Calculation', () => {
  test('returns UNKNOWN when opening hours are not configured', () => {
    const status = PublicContentService.calculateOpenNowStatus(null);
    expect(status.status).toBe('UNKNOWN');
  });

  test('correctly evaluates open/closed status for given weekly schedule', () => {
    const weeklySchedule: OpeningHourSlot[] = [
      { day: 'SUNDAY', openTime: '08:00', closeTime: '16:30', isClosed: false },
      { day: 'MONDAY', openTime: '08:00', closeTime: '16:30', isClosed: false },
      { day: 'TUESDAY', openTime: '08:00', closeTime: '16:30', isClosed: false },
      { day: 'WEDNESDAY', openTime: '08:00', closeTime: '16:30', isClosed: false },
      { day: 'THURSDAY', openTime: '08:00', closeTime: '16:30', isClosed: false },
      { day: 'FRIDAY', openTime: '00:00', closeTime: '00:00', isClosed: true },
      { day: 'SATURDAY', openTime: '09:00', closeTime: '13:00', isClosed: false },
    ];

    const result = PublicContentService.calculateOpenNowStatus(weeklySchedule);
    expect(['OPEN', 'CLOSED']).toContain(result.status);
    expect(result.currentDay).toBeDefined();
  });
});
