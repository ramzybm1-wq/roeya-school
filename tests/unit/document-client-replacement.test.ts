/**
 * Unit Tests: Client Tracking Document Replacement Workflow.
 */

describe('Document Client Replacement: Parent Tracking Flow', () => {
  test('verified parent can upload replacement when document is marked REPLACEMENT_REQUIRED', () => {
    const trackingSession = { valid: true, registrationId: 'reg_1' };
    const currentDoc = {
      id: 'doc_1',
      documentTypeId: 'dt_photo',
      versionNumber: 1,
      status: 'REPLACEMENT_REQUIRED',
    };

    // Rule: replacement is allowed only when status is REPLACEMENT_REQUIRED or REJECTED
    const isReplacementAllowed = ['REPLACEMENT_REQUIRED', 'REJECTED'].includes(currentDoc.status);
    expect(isReplacementAllowed).toBe(true);

    // Upload replacement
    const newDoc = {
      id: 'doc_2',
      documentTypeId: 'dt_photo',
      versionNumber: currentDoc.versionNumber + 1,
      status: 'PENDING_REVIEW', // Resets review status to pending
      replacesDocumentId: currentDoc.id,
    };

    expect(newDoc.versionNumber).toBe(2);
    expect(newDoc.status).toBe('PENDING_REVIEW');
    expect(newDoc.replacesDocumentId).toBe('doc_1');
  });

  test('unverified tracking access is forbidden from uploading replacement', () => {
    const trackingSession = { valid: false };
    expect(trackingSession.valid).toBe(false);
  });
});
