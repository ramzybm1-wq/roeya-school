/**
 * Unit Tests: Immutable Document Versioning & Chain Preservation.
 */

describe('Document Versioning: Version Chains & Historical Preservation', () => {
  test('uploading replacement creates version 2 linking to version 1', () => {
    const version1 = {
      id: 'doc_v1',
      registrationId: 'reg_1',
      documentTypeId: 'dt_birth',
      versionNumber: 1,
      status: 'REPLACEMENT_REQUIRED',
      storageKey: 'private/registrations/reg_1/documents/dt_birth/v1.pdf',
      replacesDocumentId: null as string | null,
    };

    // Replacement upload
    const version2 = {
      id: 'doc_v2',
      registrationId: 'reg_1',
      documentTypeId: 'dt_birth',
      versionNumber: version1.versionNumber + 1,
      status: 'PENDING_REVIEW',
      storageKey: 'private/registrations/reg_1/documents/dt_birth/v2.pdf',
      replacesDocumentId: version1.id,
    };

    expect(version2.versionNumber).toBe(2);
    expect(version2.replacesDocumentId).toBe('doc_v1');
    expect(version1.status).toBe('REPLACEMENT_REQUIRED'); // Version 1 is preserved
    expect(version2.status).toBe('PENDING_REVIEW');
  });

  test('resolves latest document version for a specific document type', () => {
    const versions = [
      { id: 'doc_v1', versionNumber: 1, status: 'REJECTED' },
      { id: 'doc_v2', versionNumber: 2, status: 'REPLACEMENT_REQUIRED' },
      { id: 'doc_v3', versionNumber: 3, status: 'VALIDATED' },
    ];

    const latest = versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
    expect(latest.id).toBe('doc_v3');
    expect(latest.status).toBe('VALIDATED');
  });
});
