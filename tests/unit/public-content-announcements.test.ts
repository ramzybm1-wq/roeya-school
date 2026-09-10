/**
 * Unit Tests: Public Announcements Scheduling & Validity Window.
 */

describe('Public Announcements: Schedule Window Filtering', () => {
  test('returns announcement only when current date falls within active schedule', () => {
    const now = new Date('2026-09-01T12:00:00Z');

    const announcements = [
      {
        id: 'ann_active',
        startAt: new Date('2026-08-15T00:00:00Z'),
        endAt: new Date('2026-09-15T23:59:59Z'),
        isActive: true,
        messageFr: 'Inscriptions ouvertes pour l’année 2026/2027.',
      },
      {
        id: 'ann_expired',
        startAt: new Date('2026-06-01T00:00:00Z'),
        endAt: new Date('2026-08-01T23:59:59Z'),
        isActive: true,
        messageFr: 'Portes ouvertes de printemps.',
      },
      {
        id: 'ann_future',
        startAt: new Date('2026-10-01T00:00:00Z'),
        endAt: new Date('2026-10-15T23:59:59Z'),
        isActive: true,
        messageFr: 'Vacances d’automne.',
      },
    ];

    const activeAnnouncements = announcements.filter(
      (a) => a.isActive && a.startAt <= now && a.endAt >= now
    );

    expect(activeAnnouncements.length).toBe(1);
    expect(activeAnnouncements[0].id).toBe('ann_active');
  });
});
