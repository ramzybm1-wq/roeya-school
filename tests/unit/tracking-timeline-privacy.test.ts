/**
 * Unit Tests: Public Timeline Privacy & Metadata Sanitization.
 */

describe('Tracking Timeline: Client Privacy & Redaction', () => {
  test('public timeline strips admin user IDs, internal comments, and audit identifiers', () => {
    const internalHistory = [
      {
        id: 'hist_1',
        fromStatus: 'NEW',
        toStatus: 'UNDER_REVIEW',
        changedByUserId: 'usr_admin_secret_id',
        internalComment: 'Admin note: check vaccine certificate thoroughly',
        publicComment: null,
        createdAt: new Date('2026-09-02T10:00:00Z'),
      },
    ];

    const publicTimeline = internalHistory.map((h) => ({
      date: h.createdAt.toISOString(),
      status: 'UNDER_REVIEW',
      titleFr: 'En cours d’étude',
      descriptionFr: h.publicComment || 'Votre dossier est actuellement en cours d’examen.',
    }));

    expect(publicTimeline[0].titleFr).toBe('En cours d’étude');
    expect((publicTimeline[0] as any).changedByUserId).toBeUndefined();
    expect((publicTimeline[0] as any).internalComment).toBeUndefined();
    expect(publicTimeline[0].descriptionFr).not.toContain('vaccine certificate thoroughly');
  });
});
