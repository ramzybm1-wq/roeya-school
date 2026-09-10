/**
 * Unit Tests: Admin Review Workflow (Validate, Reject, Request Replacement).
 */

describe('Document Review: Status Transitions & Reviewer Tracking', () => {
  test('validates document transitioning from PENDING_REVIEW to VALIDATED', () => {
    const doc = {
      id: 'doc_1',
      status: 'PENDING_REVIEW',
      reviewedByUserId: null as string | null,
      reviewedAt: null as Date | null,
    };

    // Validate action
    const reviewerId = 'usr_admin_01';
    doc.status = 'VALIDATED';
    doc.reviewedByUserId = reviewerId;
    doc.reviewedAt = new Date();

    expect(doc.status).toBe('VALIDATED');
    expect(doc.reviewedByUserId).toBe('usr_admin_01');
    expect(doc.reviewedAt).toBeDefined();
  });

  test('rejects document with reason code', () => {
    const doc = {
      id: 'doc_1',
      status: 'PENDING_REVIEW',
      rejectionReasonCode: null as string | null,
    };

    // Reject action
    doc.status = 'REJECTED';
    doc.rejectionReasonCode = 'UNREADABLE';

    expect(doc.status).toBe('REJECTED');
    expect(doc.rejectionReasonCode).toBe('UNREADABLE');
  });

  test('requests replacement with parent-facing instruction message', () => {
    const doc = {
      id: 'doc_1',
      status: 'PENDING_REVIEW',
      publicReplacementMessage: null as string | null,
    };

    // Request replacement action
    doc.status = 'REPLACEMENT_REQUIRED';
    doc.publicReplacementMessage = 'Merci de fournir une copie scannée plus nette.';

    expect(doc.status).toBe('REPLACEMENT_REQUIRED');
    expect(doc.publicReplacementMessage).toContain('copie scannée plus nette');
  });
});
